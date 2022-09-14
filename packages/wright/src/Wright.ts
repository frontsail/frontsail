import { codeFrameColumns } from '@babel/code-frame'
import {
  AtLeastOne,
  isGlobalName,
  isPagePath,
  JSON as JSONAST,
  Project,
  TemplateDiagnostics,
} from '@frontsail/core'
import {
  bind,
  camelize,
  clearArray,
  clearObject,
  debounce,
  fillObject,
  lineColumnToOffset,
  offsetToLineColumn,
} from '@frontsail/utils'
import watcher from '@parcel/watcher'
import CleanCSS from 'clean-css'
import esbuild from 'esbuild'
import EventEmitter from 'events'
import fs from 'fs-extra'
import { customAlphabet } from 'nanoid'
import path from 'path'
import prettyBytes from 'pretty-bytes'
import { format } from './format'
import { filePathToPagePath, pagePathToFilePath } from './helpers'
import { cssReset, starter } from './starter'
import { FileDiagnostic } from './types/code'

/**
 * Builds a FrontSail `Project` from a local `src` directory.
 *
 * ---
 *
 * Project structure:
 *
 * - src/assets
 * - src/components
 * - src/pages
 * - src/scripts
 * - globals.json
 * - main.js
 * - main.css
 *
 * ---
 *
 * Additions to `Project`:
 *
 * - Additionally minifies styles in production mode.
 *
 * - Allows ES modules to be used in the project scripts.
 *
 * - Formats templates, scripts, and styles.
 *
 * - Mangles and minifies scripts in production mode.
 */
export class Wright {
  /**
   * The FrontSail `Project` instance populated from the contents in `src`.
   */
  protected _project: Project

  /**
   * Code diagnostics from the source files.
   */
  protected _diagnostics: FileDiagnostic[] = []

  /**
   * A subdirectory name in the local `dist` directory where the files will be built.
   */
  protected _subdirectory: string = ''

  /**
   * Relative path to the local `dist` directory where the files will be built.
   */
  protected _dist: string = 'dist'

  /**
   * Relative path to the local `tmp` directory where the files will be prebuilt
   * in production mode.
   */
  protected _tmp: string = '.tmp'

  /**
   * A random string appended to the filenames of the built scripts and styles.
   */
  protected _buildHash: string

  /**
   * `Parcel` watcher for file changes in the working directory.
   */
  protected _watcher: watcher.AsyncSubscription | null = null

  /**
   * List of directories and files inside of `src/assets`, `src/components`, and
   * `src/pages`.
   */
  protected _srcTree: { [path: string]: 'file' | 'directory' } = {}

  /**
   * Collection of registered page paths with their relative `src` paths.
   */
  protected _pageSrcPaths: Map<string, string> = new Map()

  /**
   * Current build results from `esbuild`.
   */
  protected _esbuild: esbuild.BuildResult | null = null

  /**
   * Whether to inject a CSS reset in the built styles.
   */
  protected _cssReset: boolean = true

  /**
   * Event emitter instance.
   */
  events = new EventEmitter()

  /**
   * Add an asset to the current project.
   */
  protected _addAsset(srcPath: string, build: boolean = false): this {
    const isFile = fs.lstatSync(srcPath).isFile()

    this._clearDiagnostics(srcPath)
    this._srcTree[srcPath] = isFile ? 'file' : 'directory'

    if (isFile) {
      const assetPath = srcPath.replace('src', '')

      try {
        if (!this._project.hasAsset(assetPath)) {
          this._project.addAsset(assetPath)
          this._checkReference(assetPath)
        }

        if (build) {
          fs.copySync(srcPath, `${this._dist}${assetPath}`)
        }
      } catch (e) {
        this._addDiagnostics({ relativePath: srcPath, message: e.message, source: 'core' })
      }
    } else {
      fs.readdirSync(srcPath).forEach((subPath) => {
        this._addAsset(`${srcPath}/${subPath}`, build)
      })
    }

    return this
  }

  /**
   * Add a component to the current project.
   */
  protected _addComponent(srcPath: string, build: boolean = false): this {
    const isFile = fs.lstatSync(srcPath).isFile()

    this._clearDiagnostics(srcPath)
    this._srcTree[srcPath] = isFile ? 'file' : 'directory'

    if (isFile) {
      if (srcPath.endsWith('.html')) {
        const componentName = srcPath.slice(15, -5)
        const html = fs.readFileSync(srcPath, 'utf-8')

        this._format(srcPath)

        try {
          if (this._project.hasComponent(componentName)) {
            this._project.updateComponent(componentName, html)
          } else {
            this._project.addComponent(componentName, html)
          }

          this._lintComponent(componentName, '*')

          if (build) {
            this._postBuildComponent(componentName)
          }
        } catch (e) {
          this._addDiagnostics({ relativePath: srcPath, message: e.message, source: 'core' })
        }
      }
    } else {
      fs.readdirSync(srcPath).forEach((subPath) => {
        this._addComponent(`${srcPath}/${subPath}`, build)
      })
    }

    return this
  }

  /**
   * Add a page to the current project.
   */
  protected _addPage(srcPath: string, build: boolean = false): this {
    const isFile = fs.lstatSync(srcPath).isFile()

    this._clearDiagnostics(srcPath)
    this._srcTree[srcPath] = isFile ? 'file' : 'directory'

    if (isFile) {
      if (srcPath.endsWith('.html')) {
        const pagePath = filePathToPagePath(srcPath.replace('src/pages/', ''), true)!

        this._format(srcPath)

        if (this._pageSrcPaths.has(pagePath) && this._pageSrcPaths.get(pagePath) !== srcPath) {
          this._addDiagnostics({
            message: `Duplicate pages: '${pagePath}' and '${this._pageSrcPaths.get(pagePath)}'.`,
            relativePath: srcPath,
          })
        } else {
          const html = fs.readFileSync(srcPath, 'utf-8')

          try {
            if (this._project.hasPage(pagePath)) {
              this._project.updatePage(pagePath, html)
            } else {
              this._project.addPage(pagePath, html)
              this._pageSrcPaths.set(pagePath, srcPath)
              this._checkReference(pagePath)
            }

            this._lintPage(pagePath, '*')

            if (build) {
              this.buildPage(pagePath)
              this._buildStyles()
            }
          } catch (e) {
            this._addDiagnostics({ relativePath: srcPath, message: e.message, source: 'core' })
          }
        }
      }
    } else {
      fs.readdirSync(srcPath).forEach((subPath) => {
        this._addPage(`${srcPath}/${subPath}`, build)
      })
    }

    return this
  }

  /**
   * Add `Project` `diagnostics` to the local collection and convert them to
   * `FileDiagnostic` types.
   */
  protected _addDiagnostics(...diagnostics: Partial<FileDiagnostic>[]): void {
    diagnostics.forEach((diagnostic) => {
      const fd = fillObject(diagnostic, {
        relativePath: '',
        message: '',
        severity: 'error',
        from: -1,
        to: -1,
        start: [-1, -1],
        end: [-1, -1],
        preview: '',
        source: 'wright',
      }) as FileDiagnostic

      let code: string = ''

      if (fd.relativePath.startsWith('~')) {
        try {
          code = this._project.getPage(fd.relativePath.slice(1)).getRawHTML()
        } catch (_) {}
      } else if (fd.relativePath && fs.existsSync(fd.relativePath)) {
        code = fs.readFileSync(fd.relativePath, 'utf-8')
      }

      if (code && fd.start[0] === -1 && fd.from > -1) {
        const { start, end } = offsetToLineColumn(code, fd.from, fd.to)
        fd.start = start
        fd.end = end
      }

      if (!fd.preview && fd.relativePath && code.trim()) {
        fd.preview = codeFrameColumns(
          code,
          {
            start: { line: fd.start[0], column: fd.start[1] },
            end: { line: fd.end[0], column: fd.end[1] },
          },
          { linesAbove: 1, linesBelow: 4 },
        )
      }

      this._diagnostics.push(fd)
      this._emit('diagnostics')
    })
  }

  /**
   * Render and build a project page in the local `dist` directory.
   */
  buildPage(pagePath: string, tmp: boolean = false): void {
    let html = this._project
      .renderForce(pagePath)
      .replace(/"\/script\.js"/g, `"/${this._getScriptsOutname()}"`)
      .replace(/"\/style\.css"/g, `"/${this._getStylesOutname()}"`)

    if (this._subdirectory) {
      html = html.replace(/(data|href|srcset|src)="(\/.+?)"/g, `$1="/${this._subdirectory}$2"`)
    }

    if (html.startsWith('<html')) {
      html = `<!DOCTYPE html>${html}`
    }

    fs.outputFileSync(
      `${tmp ? this._tmp : this._dist}/${pagePathToFilePath(pagePath)}`,
      html.includes('</html>')
        ? html
        : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`,
    )
  }

  /**
   * Build the final scripts file in the local `dist` directory.
   */
  protected async _buildScripts(): Promise<void> {
    const isProd = this._project.isProduction()

    let results: esbuild.BuildResult
    let code: string

    this._clearDiagnostics(/^src\/(scripts\/|main\.js$)/)

    if (this._esbuild?.rebuild) {
      results = await this._esbuild.rebuild().catch((reason) => reason)
    } else {
      const options: esbuild.BuildOptions = {
        outdir: isProd ? this._tmp : this._dist,
        bundle: true,
        platform: 'neutral',
        mainFields: ['module', 'main'],
        logLevel: 'silent',
        write: false,
        minify: isProd,
        incremental: !isProd,
      }

      if (isProd) {
        options.stdin = {
          contents: "import './main.js'\n\n" + this._project.buildScripts(),
          resolveDir: 'src',
          sourcefile: 'components/**/*.html',
        }
      } else {
        options.entryPoints = ['src/main.js']
      }

      results = await esbuild.build(options).catch((reason) => reason)

      if (!isProd) {
        this._esbuild = results
      }
    }

    if (results.errors.length > 0 || results.warnings.length > 0) {
      results.errors.forEach((error) => {
        this._addDiagnostics({
          message: error.text + '.',
          severity: 'error',
          relativePath: error.location?.file,
          start: [error.location?.line ?? -1, (error.location?.column ?? -2) + 1],
          end: this._getEndLineColumnFromEsbuildLocation(error.location),
        })
      })

      results.warnings.forEach((warning) => {
        this._addDiagnostics({
          message: warning.text + '.',
          severity: 'warning',
          relativePath: warning.location?.file,
          start: [warning.location?.line ?? -1, (warning.location?.column ?? -2) + 1],
          end: this._getEndLineColumnFromEsbuildLocation(warning.location),
        })
      })
    } else {
      code = results.outputFiles![0].text

      if (!isProd) {
        code += `\n// src/components/**/*.html\n${this._project.buildScripts()}\n`
      }

      fs.outputFileSync(`${isProd ? this._tmp : this._dist}/${this._getScriptsOutname()}`, code)

      this._emit('stats')
    }
  }

  /**
   * Build the final styles file in the local `dist` directory.
   */
  protected _buildStyles(): void {
    const isProd = this._project.isProduction()

    this._clearDiagnostics(/^src\/main\.css$/)._addDiagnostics(
      ...this._project
        .setCustomCSS(fs.readFileSync('src/main.css', 'utf-8'))
        .lintCustomCSS('*')
        .getCustomCSSDiagnostics('*')
        .map(
          (diagnostic) =>
            ({
              ...diagnostic,
              relativePath: 'src/main.css',
              source: 'core',
            } as Partial<FileDiagnostic>),
        ),
    )

    let css = (this._cssReset ? cssReset.join('\n') : '') + this._project.buildStyles()

    if (isProd) {
      const cleanCSS = new CleanCSS().minify(css)

      if (cleanCSS.errors.length === 0 && cleanCSS.warnings.length === 0) {
        css = cleanCSS.styles
      }
    }

    fs.outputFileSync(`${isProd ? this._tmp : this._dist}/${this._getStylesOutname()}`, css)

    this._emit('stats')
  }

  /**
   * Lint a specific `referenceName` in templates where it's used.
   */
  protected _checkReference(referenceName: string): this {
    this._project.listComponents().forEach((name) => {
      if (this._project.getComponent(name).hasReference(referenceName)) {
        this._lintComponent(name, 'references')
      }
    })

    this._project.listPages().forEach((path) => {
      if (this._project.getPage(path).hasReference(referenceName)) {
        this._lintPage(path, 'references')
      }
    })

    return this
  }

  /**
   * Clear all diagnostics.
   */
  protected _clearAllDiagnostics(): void {
    if (this._diagnostics.length > 0) {
      clearArray(this._diagnostics)
      this._emit('diagnostics')
    }
  }

  /**
   * Remove all files and directories from the current working directory.
   */
  clearCurrentDirectory(): void {
    fs.emptyDirSync('.')
  }

  /**
   * Clear diagnostics related to a specified `relativePath`.
   */
  protected _clearDiagnostics(relativePath: string | RegExp, coreOnly: boolean = false): this {
    let index: number = 0
    let updated: boolean = false

    for (const diagnostic of [...this._diagnostics]) {
      if (
        ((typeof relativePath === 'string' && diagnostic.relativePath === relativePath) ||
          (typeof relativePath !== 'string' && relativePath.test(diagnostic.relativePath))) &&
        (!coreOnly || diagnostic.source === 'core')
      ) {
        this._diagnostics.splice(index, 1)
        updated = true
      } else {
        index++
      }
    }

    if (updated) {
      this._emit('diagnostics')
    }

    return this
  }

  /**
   * Remove all files and directories from the local `dist` directory.
   */
  clearDistDirectory(): void {
    fs.emptyDirSync('dist')
  }

  /**
   * Emit an event with debouncing.
   */
  protected _emit(eventName: 'diagnostics' | 'stats'): void {
    debounce(`event:${eventName}`, this.events.emit.bind(this.events, eventName))
  }

  /**
   * Make sure that all required project files exist in the `src` directory.
   */
  protected _ensureProjectFiles(): void {
    fs.ensureDirSync('src/assets')
    fs.ensureDirSync('src/components')
    fs.ensureDirSync('src/pages')
    fs.ensureDirSync('src/scripts')
    fs.ensureFileSync('src/main.js')
    fs.ensureFileSync('src/main.css')

    if (!fs.existsSync('src/globals.json')) {
      fs.outputFileSync('src/globals.json', '{}')
    }
  }

  /**
   * Expand abbreviations and format file contents with `prettier`.
   */
  protected _format(relativePath: string): this {
    try {
      const code = fs.readFileSync(relativePath, 'utf-8')
      const formattedCode = format(code, relativePath, this._project)

      while (code !== formattedCode) {
        try {
          fs.outputFileSync(relativePath, formattedCode)
          break
        } catch (_) {}
      }
    } catch (_) {}

    return this
  }

  /**
   * Get the stored diagnostics.
   */
  getDiagnostics(filter?: { relativePath?: RegExp }): FileDiagnostic[] {
    return this._diagnostics.filter((diagnostic) => {
      if (filter?.relativePath) {
        return filter.relativePath.test(diagnostic.relativePath)
      }

      return true
    })
  }

  /**
   * Get the name of the `dist` directory.
   */
  getDistName(): string {
    return this._dist
  }

  /**
   * Get a line-column par of the end range from an `esbuild` `location`.
   */
  protected _getEndLineColumnFromEsbuildLocation(
    location: esbuild.Location | null,
  ): [line: number, column: number] {
    if (location) {
      const text = fs.readFileSync(location.file, 'utf-8')
      const { from } = lineColumnToOffset(text, [location.line, location.column + 1])
      return offsetToLineColumn(text, from, from + location.length).end
    }

    return [-1, -1]
  }

  /**
   * Generate the file name of the built scripts file.
   */
  protected _getScriptsOutname(): string {
    return this._project.isProduction() ? `script.${this._buildHash}.js` : 'script.js'
  }

  /**
   * Get the file size of the built scripts file.
   */
  getScriptsSize(): string {
    if (fs.existsSync(`${this._dist}/${this._getScriptsOutname()}`)) {
      return prettyBytes(fs.statSync(`${this._dist}/${this._getScriptsOutname()}`).size)
    }

    return '0 B'
  }

  /**
   * Generate the file name of the built styles file.
   */
  protected _getStylesOutname(): string {
    return this._project.isProduction() ? `style.${this._buildHash}.css` : 'style.css'
  }

  /**
   * Get the file size of the built styles file.
   */
  getStylesSize(): string {
    if (fs.existsSync(`${this._dist}/${this._getStylesOutname()}`)) {
      return prettyBytes(fs.statSync(`${this._dist}/${this._getStylesOutname()}`).size)
    }

    return '0 B'
  }

  /**
   * Create starter project files in the current working directory.
   */
  initStarterProject(cliVersion: string = 'latest'): void {
    this._ensureProjectFiles()

    const packageJSON = JSON.parse(JSON.stringify(starter.packageJSON))
    packageJSON.devDependencies['@frontsail/cli'] = cliVersion

    fs.outputJsonSync('.vscode/settings.json', starter.vscodeSettingsJSON, { spaces: 2 })
    fs.outputFileSync('src/assets/favicon.ico', starter.faviconICO, 'base64')
    fs.outputJsonSync('src/globals.json', starter.srcGlobalsJSON, { spaces: 2 })
    fs.outputFileSync('src/main.js', starter.srcMainJS.join('\n'))
    fs.outputFileSync('src/components/base.html', starter.srcComponentsBaseHTML.join('\n'))
    fs.outputFileSync('src/pages/index.html', starter.srcPagesIndexHTML.join('\n'))
    fs.outputJsonSync('frontsail.config.json', starter.frontsailConfigJSON, { spaces: 2 })
    fs.outputJsonSync('package.json', packageJSON, { spaces: 2 })
    fs.outputFileSync('.gitignore', starter.gitignore.join('\n'))
  }

  /**
   * Lint a component named `componentName` and store its diagnostics if any.
   */
  protected _lintComponent(componentName: string, ...tests: AtLeastOne<TemplateDiagnostics>): this {
    const relativePath = `src/components/${componentName}.html`

    this._clearDiagnostics(relativePath, true)._addDiagnostics(
      ...this._project
        .lintComponent(componentName, ...tests)
        .getComponentDiagnostics(componentName, '*')
        .map(
          (diagnostic) =>
            ({
              ...diagnostic,
              relativePath,
              source: 'core',
            } as Partial<FileDiagnostic>),
        ),
    )

    return this
  }

  /**
   * Lint a page with the path `pagePath` and store its diagnostics if any.
   */
  protected _lintPage(pagePath: string, ...tests: AtLeastOne<TemplateDiagnostics>): this {
    const relativePath = this._pageSrcPaths.get(pagePath)

    if (relativePath) {
      this._clearDiagnostics(relativePath, true)._addDiagnostics(
        ...this._project
          .lintPage(pagePath, ...tests)
          .getPageDiagnostics(pagePath, '*')
          .map(
            (diagnostic) =>
              ({
                ...diagnostic,
                relativePath,
                source: 'core',
              } as Partial<FileDiagnostic>),
          ),
      )
    }

    return this
  }

  /**
   * Lint all components and pages.
   */
  lintTemplates(...tests: AtLeastOne<TemplateDiagnostics>): this {
    this._project
      .listComponents()
      .forEach((componentName) => this._lintComponent(componentName, ...tests))

    this._project.listPages().forEach((pagePath) => this._lintPage(pagePath, ...tests))

    return this
  }

  /**
   * Get a sorder list of all registered asset paths in the project.
   */
  listAssets(): string[] {
    return this._project.listAssets()
  }

  /**
   * Get a sorder list of all registered component names in the project.
   */
  listComponents(): string[] {
    return this._project.listComponents()
  }

  /**
   * Get a list of all global variable names in their original order.
   */
  listGlobals(): string[] {
    return this._project.listGlobals()
  }

  /**
   * Get a sorder list of all registered page paths in the project.
   */
  listPages(): string[] {
    return this._project.listPages()
  }

  /**
   * Create a new FrontSail project.
   */
  newProject(mode: 'development' | 'production'): void {
    this._project = new Project().setEnvironment(mode)
    this._buildHash = customAlphabet('01234567890abcdefghijklmnopqrstuvwxyz', 10)()
    this._pageSrcPaths.clear()
  }

  /**
   * Handle file changes from the local `src` directory and project configuration files.
   */
  @bind protected async _onFileChange(_: Error | null, events: watcher.Event[]): Promise<void> {
    events
      .filter((event) => {
        event.path = path.relative(process.cwd(), event.path).replace(/\\/g, '/')

        return (
          event.path.startsWith('src/') ||
          ['frontsail.config.json', 'frontsail.build.js', 'package.json'].includes(event.path)
        )
      })
      .sort((a) => (a.type === 'delete' ? -1 : 0))
      .forEach(async (event) => {
        // Project files
        //
        if (
          ['frontsail.build.js', 'package.json'].includes(event.path) ||
          /^src\/scripts\/.+\.js$/.test(event.path)
        ) {
          if (event.type === 'create' || event.type === 'update') {
            this._format(event.path)
          }
        }
        //
        // Config
        //
        if (event.path === 'frontsail.config.json') {
          if (event.type === 'create' || event.type === 'update') {
            this._format(event.path)
          }

          this.updateConfig(true)
        }
        //
        // Globals
        //
        else if (event.path === 'src/globals.json') {
          if (event.type === 'create' || event.type === 'update') {
            this._format(event.path)
          } else if (event.type === 'delete') {
            fs.outputJSONSync(event.path, {})
          }

          this.setGlobals(true)
        }
        //
        // Scripts
        //
        else if (event.path === 'src/main.js') {
          if (event.type === 'create' || event.type === 'update') {
            this._format(event.path)
          } else if (event.type === 'delete') {
            fs.ensureFileSync(event.path)
          }

          await this._buildScripts()
        } else if (event.path.startsWith('src/scripts/')) {
          await this._buildScripts()
        }
        //
        // Styles
        //
        else if (event.path === 'src/main.css') {
          if (event.type === 'create' || event.type === 'update') {
            this._format(event.path)
          } else if (event.type === 'delete') {
            fs.ensureFileSync(event.path)
          }

          this._buildStyles()
        }
        //
        // Assets
        //
        else if (event.path.startsWith('src/assets/')) {
          if (event.type === 'delete') {
            this._removeAsset(event.path)
          } else {
            this._addAsset(event.path, true)
          }
        }
        //
        // Components
        //
        else if (event.path.startsWith('src/components/')) {
          if (event.type === 'delete') {
            this._removeComponent(event.path)
          } else {
            this._addComponent(event.path, true)
          }
        }
        //
        // Pages
        //
        else if (event.path.startsWith('src/pages/')) {
          if (event.type === 'delete') {
            this._removePage(event.path)
          } else {
            this._addPage(event.path, true)
          }
        }
      })

    this._emit('stats')
  }

  /**
   * Walk through all assets and templates in the `src` directory and register them
   * in the working `Project` instance.
   */
  populate(): void {
    clearObject(this._srcTree)
    fs.readdirSync('src/assets').forEach((path) => this._addAsset(`src/assets/${path}`))
    fs.readdirSync('src/components').forEach((path) => this._addComponent(`src/components/${path}`))
    fs.readdirSync('src/pages').forEach((path) => this._addPage(`src/pages/${path}`))
  }

  /**
   * Actions after building a component.
   */
  protected _postBuildComponent(componentName: string): this {
    this._buildScripts()
    this._buildStyles()

    try {
      const includers = this._project.getIncluders(componentName, true)

      includers.components.forEach((name) => this._lintComponent(name, '*'))
      includers.pages.forEach((path) => this._lintPage(path, '*').buildPage(path))
    } catch (_) {}

    return this
  }

  /**
   * Rebuild all `dist` files.
   */
  async rebuild(): Promise<void> {
    const isProd = this._project.isProduction()

    fs.removeSync(this._tmp)

    if (!isProd) {
      this.clearDistDirectory()
    }

    this._project
      .listAssets()
      .forEach((path) => fs.copySync(`src${path}`, `${isProd ? this._tmp : this._dist}${path}`))
    this._project.listPages().forEach((path) => this.buildPage(path, isProd))

    await this._buildScripts()
    this._buildStyles()

    if (isProd) {
      this.clearDistDirectory()
      fs.moveSync(this._tmp, this._dist, { overwrite: true })
    }
  }

  /**
   * Remove a single custom page.
   *
   * @throws an error when trying to remove a source page.
   */
  removeCustomPage(pagePath: string): void {
    if (this._pageSrcPaths.has(pagePath) && !this._pageSrcPaths.get(pagePath)!.startsWith('~')) {
      throw new Error(`The page '${pagePath}' is not a custom page and cannot be removed.`)
    }

    const relativePath = `~${pagePath}`

    this._clearDiagnostics(relativePath)
    this._pageSrcPaths.delete(pagePath)

    if (isPagePath(pagePath)) {
      this._removeBubble(`${this._dist}/${pagePathToFilePath(pagePath)}`)
    }

    try {
      this._project.removePage(pagePath)
    } catch (_) {}
  }

  /**
   * Remove an asset from the current project.
   */
  protected _removeAsset(srcPath: string): this {
    const type = this._srcTree[srcPath]

    delete this._srcTree[srcPath]

    if (type === 'file') {
      const assetPath = srcPath.replace('src', '')

      try {
        this._clearDiagnostics(srcPath)
          ._removeBubble(`${this._dist}${assetPath}`)
          ._project.removeAsset(assetPath)

        this._checkReference(assetPath)
      } catch (_) {}
    } else if (type === 'directory') {
      Object.keys(this._srcTree)
        .filter((path) => path.startsWith(`${srcPath}/`))
        .forEach((subPath) => this._removeAsset(subPath))
    }

    return this
  }

  /**
   * Remove a component from the current project.
   */
  protected _removeComponent(srcPath: string): this {
    const type = this._srcTree[srcPath]
    const componentName = srcPath.slice(15, -5)

    delete this._srcTree[srcPath]

    if (type === 'file') {
      if (srcPath.endsWith('.html')) {
        try {
          this._clearDiagnostics(srcPath)._project.removeComponent(componentName)
          this._postBuildComponent(componentName)
        } catch (_) {}
      }
    } else if (type === 'directory') {
      Object.keys(this._srcTree)
        .filter((path) => path.startsWith(`${srcPath}/`))
        .forEach((subPath) => this._removeComponent(subPath))
    }

    return this
  }

  /**
   * Remove a page from the current project.
   */
  protected _removePage(srcPath: string): this {
    const type = this._srcTree[srcPath]
    const pagePath = filePathToPagePath(srcPath.replace('src/pages/', ''), true)!

    delete this._srcTree[srcPath]

    if (type === 'file') {
      if (srcPath.endsWith('.html')) {
        try {
          this._clearDiagnostics(srcPath)
            ._removeBubble(`${this._dist}/${pagePathToFilePath(pagePath)}`)
            ._project.removePage(pagePath)

          this._pageSrcPaths.delete(pagePath)
          this._buildStyles()

          // Resolve duplicate
          for (const path in this._srcTree) {
            if (
              path === `src/pages${pagePath}.html` ||
              path === `src/pages${pagePath}/index.html`
            ) {
              this._addPage(path, true)
              break
            }
          }
        } catch (_) {}
      }
    } else if (type === 'directory') {
      Object.keys(this._srcTree)
        .filter((path) => path.startsWith(`${srcPath}/`))
        .forEach((subPath) => this._removePage(subPath))
    }

    return this
  }

  /**
   * Remove a file or directory by its `path` and its empty parent directories recursively.
   */
  protected _removeBubble(path: string): this {
    if (fs.existsSync(path)) {
      const isDir = fs.lstatSync(path).isDirectory()

      if (!isDir || fs.readdirSync(path).length === 0) {
        fs.removeSync(path)

        const parentDir = path.split('/').slice(0, -1).join('/')

        if (parentDir) {
          this._removeBubble(parentDir)
        }
      }
    }

    return this
  }

  /**
   * Add or update a single custom page.
   *
   * @throws an error when trying to update a source page.
   */
  setCustomPage(pagePath: string, html: string): void {
    if (this._pageSrcPaths.has(pagePath) && !this._pageSrcPaths.get(pagePath)!.startsWith('~')) {
      throw new Error(`The page '${pagePath}' is not a custom page and cannot be updated.`)
    }

    const relativePath = `~${pagePath}`
    this._clearDiagnostics(relativePath)

    try {
      if (this._project.hasPage(pagePath)) {
        this._project.updatePage(pagePath, html)
      } else {
        this._project.addPage(pagePath, html)
        this._pageSrcPaths.set(pagePath, relativePath)
      }

      this._lintPage(pagePath, '*')
    } catch (e) {
      this._addDiagnostics({ relativePath, message: e.message, source: 'core' })
    }
  }

  /**
   * Set the globals variables in the project from the local `globals.json` file.
   */
  setGlobals(rebuild: boolean = false): void {
    const json = fs.readFileSync('src/globals.json', 'utf-8')
    const ast = new JSONAST(json)

    this._clearDiagnostics('src/globals.json')

    if (ast.hasProblems('*')) {
      this._addDiagnostics(
        ...ast
          .getDiagnostics('*')
          .map((diagnostic) => ({ ...diagnostic, relativePath: 'src/globals.json' })),
      )
    } else {
      try {
        const nodes = ast.getPropertyNodes()
        const globals: { [name: string]: string } = {}

        for (const node of nodes) {
          if (isGlobalName(node.key.value)) {
            if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
              globals[node.key.value] = node.value.value
            } else {
              this._addDiagnostics({
                relativePath: 'src/globals.json',
                message: `The value of '${node.key.value}' must be a string.`,
                severity: 'warning',
                from: node.value.loc!.start.offset,
                to: node.value.loc!.end.offset,
              })
            }
          } else {
            let suggestion = '$' + camelize(node.key.value.replace(/([A-Z])/g, '-$1'))

            if (!isGlobalName(suggestion)) {
              suggestion += 1
            }

            this._addDiagnostics({
              relativePath: 'src/globals.json',
              message: `The global variable name '${node.key.value}' is not valid. Try with '${suggestion}'.`,
              severity: 'warning',
              from: node.key.loc!.start.offset,
              to: node.key.loc!.end.offset,
            })
          }
        }

        this._project.setGlobals(globals)

        if (rebuild) {
          this.lintTemplates('*')
          this.rebuild()
        }
      } catch (e) {
        this._addDiagnostics({
          relativePath: 'src/globals.json',
          message: e.message,
          severity: 'error',
          from: 0,
          to: json.length,
        })
      }
    }
  }

  /**
   * Build the project files in the local `dist` directory. The builder will continue
   * to watch for file changes if the `mode` is set to 'development'. In 'production'
   * builds all output files are optimized/minified.
   */
  async start(mode: 'development' | 'production'): Promise<void> {
    this.newProject(mode)
    this._ensureProjectFiles()
    this._clearAllDiagnostics()
    this.updateConfig()
    this.setGlobals()
    this.populate()
    this.lintTemplates('*')

    await this.rebuild()

    if (this._project.isDevelopment()) {
      await this._startWatching()
    }
  }

  /**
   * Watch for file changes in the `src` directory and add event listeners to handle
   * callbacks from the `Parcel` watcher.
   *
   * Also watch for configuration files.
   */
  protected async _startWatching(): Promise<void> {
    this._watcher = await watcher.subscribe(process.cwd(), this._onFileChange, {
      ignore: ['node_modules'],
    })
  }

  /**
   * Stop the build process by deregistering all watchers and closing their processes.
   * Works only if the build method was called in 'development' mode.
   */
  async stop(): Promise<void> {
    if (this._project.isDevelopment()) {
      this._stopWatching()
    }
  }

  /**
   * Remove listeners from all watchers and close them afterwards.
   */
  protected _stopWatching(): void {
    // Stop `Parcel` watcher
    if (this._watcher) {
      this._watcher.unsubscribe()
      this._watcher = null
    }

    // Dispose `esbuild`
    if (this._esbuild) {
      this._esbuild.rebuild?.dispose()
      this._esbuild = null
    }
  }

  /**
   * Set the builder settings from the local `frontsail.config.json` file.
   */
  updateConfig(rebuildOnChange: boolean = false): void {
    const json = fs.readFileSync('frontsail.config.json', 'utf-8')
    const ast = new JSONAST(json)

    this._clearDiagnostics('frontsail.config.json')

    if (ast.hasProblems('*')) {
      this._addDiagnostics(
        ...ast
          .getDiagnostics('*')
          .map((diagnostic) => ({ ...diagnostic, relativePath: 'frontsail.config.json' })),
      )
    } else {
      try {
        const nodes = ast.getPropertyNodes()

        for (const node of nodes) {
          //
          // Subdirectory
          //
          if (node.key.value === 'subdirectory') {
            if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
              const subdirectory = node.value.value.replace(/^\//, '').replace(/\/$/, '')

              if (subdirectory !== this._subdirectory) {
                this._subdirectory = subdirectory
                this._dist = `dist/${this._subdirectory}`

                if (rebuildOnChange) {
                  this.rebuild()
                }
              }
            } else {
              this._addDiagnostics({
                relativePath: 'frontsail.config.json',
                message: "The 'subdirectory' value must be a string.",
                severity: 'error',
                from: node.value.loc!.start.offset,
                to: node.value.loc!.end.offset,
              })
            }
          }
          //
          // CSS reset
          //
          else if (node.key.value === 'cssReset') {
            if (node.value.type === 'Literal' && typeof node.value.value === 'boolean') {
              if (this._cssReset !== node.value.value) {
                this._cssReset = node.value.value

                if (rebuildOnChange) {
                  this._buildStyles()
                }
              }
            } else {
              this._addDiagnostics({
                relativePath: 'frontsail.config.json',
                message: "The 'cssReset' value must be a boolean.",
                severity: 'error',
                from: node.value.loc!.start.offset,
                to: node.value.loc!.end.offset,
              })
            }
          } else {
            this._addDiagnostics({
              relativePath: 'frontsail.config.json',
              message: `Unknown option '${node.key.value}'.`,
              severity: 'warning',
              from: node.key.loc!.start.offset,
              to: node.key.loc!.end.offset,
            })
          }
        }
      } catch (e) {
        this._addDiagnostics({
          relativePath: 'frontsail.config.json',
          message: e.message,
          severity: 'error',
          from: 0,
          to: json.length,
        })
      }
    }
  }
}
