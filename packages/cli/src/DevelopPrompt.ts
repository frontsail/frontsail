import { bind, nth } from '@frontsail/utils'
import { wright } from '@frontsail/wright'
import bs from 'browser-sync'
import portfinder from 'portfinder'
import serverDestroy from 'server-destroy'
import {
  awaitKeys,
  clear,
  createGap,
  emptyLine,
  getCLIVersion,
  hideCursor,
  printContainer,
  printGap,
  Tab,
} from './helpers'
import { InitialPrompt } from './InitialPrompt'

/**
 * Describes the possible tab values in this prompt.
 */
export type TabValues = 'summary' | 'diagnostics'

/**
 * Displays the develop interface.
 */
export class DevelopPrompt {
  /**
   * The container tabs.
   */
  protected _tabs: Tab<TabValues>[] = [
    {
      label: 'Summary',
      value: 'summary',
      active: true,
    },
    {
      label: 'Diagnostics',
      value: 'diagnostics',
    },
  ]

  /**
   * Message shown in the top right area in the container.
   */
  protected _containerHint: string = '§d((Use arrow keys to navigate))'

  /**
   * Current (displayed) diagnostic index.
   */
  protected _diagnosticsIndex: number = 0

  /**
   * The previous number of project diagnostics.
   */
  protected _prevDiagnosticsCount: number = 0

  /**
   * The active preview server instance.
   */
  protected _previewServer = bs.create()

  /**
   * Instantiate the prompt.
   */
  constructor() {
    this._init()
  }

  /**
   * Change the currently active tab to its sibling.
   */
  protected _cycleActiveTab(direction: 'left' | 'right'): void {
    const tabValues = this._tabs.map((tab) => tab.value) as TabValues[]
    const index = tabValues.indexOf(this._getActiveTab())
    this._setActiveTab(nth(tabValues, index + (direction === 'right' ? 1 : -1)))
  }

  /**
   * Stop watchers and servers, remove all event listeners from this prompt, and show
   * the home screen when everything is done.
   */
  protected async _exit(): Promise<void> {
    wright.events.removeListener('diagnostics', this._refresh)
    wright.events.removeListener('stats', this._refresh)
    await wright.stop()
    this._stopServer()
    process.stdout.off('resize', this._refresh)
    new InitialPrompt('back')
  }

  /**
   * Get the value of the active tab.
   */
  protected _getActiveTab(): TabValues {
    return this._tabs.find((tab) => tab.active)!.value
  }

  /**
   * Initialize stuff in the correct order.
   */
  protected async _init(): Promise<void> {
    await this._startServer()
    await this._subscribe()

    this._refresh()
  }

  /**
   * Repaint the current screen.
   */
  @bind protected _refresh(): void {
    clear()

    const contents: string[] = []
    const diagnostics = wright.getDiagnostics()
    let activeTab = this._getActiveTab()

    if (this._prevDiagnosticsCount !== diagnostics.length) {
      if (activeTab === 'diagnostics' && diagnostics.length === 0) {
        activeTab = this._setActiveTab('summary')
      } else if (activeTab !== 'diagnostics' && diagnostics.length > 0) {
        activeTab = this._setActiveTab('diagnostics')
      }

      this._prevDiagnosticsCount = diagnostics.length
    }

    this._tabs.find((tab) => tab.value === 'diagnostics')!.label =
      diagnostics.length === 0 ? 'Diagnostics' : `Diagnostics (${diagnostics.length})`

    if (activeTab === 'summary') {
      const stats = [
        {
          label: 'Assets',
          value: '',
          count: wright.listAssets().length,
          diagnostics: wright.getDiagnostics({ relativePath: /^src\/assets\// }),
        },
        {
          label: 'Components',
          value: '',
          count: wright.listComponents().length,
          diagnostics: wright.getDiagnostics({ relativePath: /^src\/components\// }),
        },
        {
          label: 'Pages',
          value: '',
          count: wright.listPages().length,
          diagnostics: wright.getDiagnostics({ relativePath: /^src\/pages\// }),
        },
        '',
        {
          label: 'Scripts',
          value: '',
          count: wright.getScriptsSize(),
          diagnostics: wright.getDiagnostics({
            relativePath: /^src\/(scripts\/|main\.js$)/,
          }),
        },
        {
          label: 'Styles',
          value: '',
          count: wright.getStylesSize(),
          diagnostics: wright.getDiagnostics({ relativePath: /^src\/main\.css$/ }),
        },
      ]

      stats.forEach((group) => {
        if (typeof group === 'object') {
          if (group.diagnostics.length > 0) {
            const errors = group.diagnostics.filter((diagnostic) => {
              return diagnostic.severity === 'error'
            }).length

            const warnings = group.diagnostics.filter((diagnostic) => {
              return diagnostic.severity === 'warning'
            }).length

            const problems =
              (errors > 0 ? `${errors} error${errors > 1 ? 's' : ''}` : '') +
              (errors > 0 && warnings > 0 ? ' and ' : '') +
              (warnings > 0 ? `${warnings} warning${warnings > 1 ? 's' : ''}` : '')

            group.value = `${group.count} §d((${problems}))`
          } else {
            group.value = `§g(${group.count})`
          }
        }
      })

      contents.push(
        ...stats.map((group) =>
          typeof group === 'string' ? group : `${group.label}: ${group.value}`,
        ),
        '',
        `Preview server running at §g(http://localhost:${this._previewServer.getOption('port')})`,
        `BrowserSync UI running at §g(http://localhost:${this._previewServer
          .getOption('ui')
          .get('port')})`,
      )
    } else if (activeTab === 'diagnostics') {
      if (this._diagnosticsIndex < 0) {
        this._diagnosticsIndex = 0
      } else if (this._diagnosticsIndex >= diagnostics.length) {
        this._diagnosticsIndex = diagnostics.length - 1
      }

      const diagnostic = diagnostics[this._diagnosticsIndex]

      if (diagnostic) {
        const index = diagnostics.indexOf(diagnostic) + 1
        const codePosition =
          diagnostic.start[0] > -1 ? `:${diagnostic.start[0]}:${diagnostic.start[1]}` : ''

        if (diagnostic.severity === 'warning') {
          contents.push(`§yb(Warning) ${diagnostic.message}`)
        } else {
          contents.push(`§rb(Error) ${diagnostic.message}`)
        }

        contents.push('', `§b(${diagnostic.relativePath}${codePosition})`)

        if (diagnostic.preview) {
          contents.push(...diagnostic.preview.split('\n').slice(0, 5))
        }

        contents.push(
          '',
          createGap(
            `§d(Showing ${index} of ${diagnostics.length})`,
            index < diagnostics.length
              ? `§d((Press) §b(↓) §d(to show next))`
              : `§d((Press) §b(↑) §d(to show previous))`,
            -4,
          ),
        )
      } else {
        contents.push('§g(No problems found!)', '', "§d(It's just plain sailing, for now...)")
      }
    }

    printContainer(contents, this._tabs, this._containerHint)

    for (let i = 0; i < process.stdout.rows - 5 - contents.length; i++) {
      emptyLine()
    }

    printGap('§d(Waiting for file changes...)', '§d((Press) §b(Q) §d(to quit))')
    hideCursor()
  }

  /**
   * Set the currently active tab.
   */
  protected _setActiveTab(value: TabValues): TabValues {
    this._tabs.forEach((tab) => (tab.active = tab.value === value))
    return value
  }

  /**
   * Set the `label` of a tab with a specific `value`.
   */
  protected _setTabLabel(label: string, value: TabValues): void {
    this._tabs.forEach((tab) => {
      if (tab.value === value) {
        tab.label = label
      }
    })
  }

  /**
   * Start the preview server.
   */
  protected async _startServer(): Promise<void> {
    const port = await portfinder.getPortPromise({ port: 5417 })
    const uiPort = await portfinder.getPortPromise({ port: port + 1 })
    const socketPort = await portfinder.getPortPromise({ port: uiPort + 1 })

    await new Promise<void>((resolve) => {
      this._previewServer.init({
        server: 'dist',
        port,
        ui: { port: uiPort },
        socket: { port: socketPort },
        watch: true,
        logLevel: 'silent',
        notify: false,
        open: false,
        callbacks: {
          ready: () => {
            serverDestroy((this._previewServer as any).instance.io.httpServer)
            resolve()
          },
        },
      } as bs.Options)
    })
  }

  /**
   * Stop the preview server.
   */
  protected _stopServer(): void {
    const io = (this._previewServer as any).instance.io

    io.close()
    io.httpServer.destroy()

    this._previewServer.exit()
  }

  /**
   * Start watchers and attach event listeners for this prompt.
   */
  protected async _subscribe(): Promise<void> {
    await wright.build('development')
    wright.events.addListener('diagnostics', this._refresh)
    wright.events.addListener('stats', this._refresh)

    process.stdout.on('resize', this._refresh)

    awaitKeys({
      up: () => {
        this._updateContainerHint()
        this._diagnosticsIndex--
        this._refresh()
      },
      down: () => {
        this._updateContainerHint()
        this._diagnosticsIndex++
        this._refresh()
      },
      right: () => {
        this._updateContainerHint()
        this._cycleActiveTab('right')
        this._refresh()
      },
      left: () => {
        this._updateContainerHint()
        this._cycleActiveTab('left')
        this._refresh()
      },
      q: () => {
        this._exit()
        return true
      },
    })
  }

  /**
   * Replace the arrow keys hint with a branding text.
   */
  protected _updateContainerHint(): void {
    this._containerHint = `§b(_D CLI v${getCLIVersion()}) `
  }
}
