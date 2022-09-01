import { codeFrameColumns } from '@babel/code-frame'
import { Project } from '@frontsail/core'
import {
  bind,
  clearArray,
  debounce,
  fillObject,
  lineColumnToOffset,
  offsetToLineColumn
} from '@frontsail/utils'
import chokidar from 'chokidar'
import CleanCSS from 'clean-css'
import esbuild from 'esbuild'
import EventEmitter from 'events'
import fs from 'fs-extra'
import glob from 'glob'
import { customAlphabet } from 'nanoid'
import prettyBytes from 'pretty-bytes'
import { format } from './format'
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
   * A random string appended to the filenames of the built scripts and styles.
   */
  protected _buildHash: string = customAlphabet('1234567890abcdef', 10)()

  /**
   * `Chokidar` watcher for file changes in the working directory.
   */
  protected _watcher: chokidar.FSWatcher | null = null

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

  protected _addDiagnostics(...diagnostics: Partial<FileDiagnostic>[]): void {
    diagnostics.forEach((diagnostic) => {
      const prepared = fillObject(diagnostic, {
        relativePath: '',
        message: '',
        severity: 'error',
        from: -1,
        to: -1,
        start: [-1, -1],
        end: [-1, -1],
        preview: '',
      }) as FileDiagnostic

      const code = prepared.relativePath ? fs.readFileSync(prepared.relativePath, 'utf-8') : ''

      if (code && prepared.start[0] === -1 && prepared.from > -1) {
        const { start, end } = offsetToLineColumn(code, prepared.from, prepared.to)
        prepared.start = start
        prepared.end = end
      }

      if (!prepared.preview && prepared.relativePath && fs.existsSync(prepared.relativePath)) {
        const code = fs.readFileSync(prepared.relativePath, 'utf-8')

        if (code.trim()) {
          prepared.preview = codeFrameColumns(
            code,
            {
              start: { line: prepared.start[0], column: prepared.start[1] },
              end: { line: prepared.end[0], column: prepared.end[1] },
            },
            { linesAbove: 1, linesBelow: 4 },
          )
        }
      }

      this._diagnostics.push(prepared)
      this._emit('diagnostics')
    })
  }

  /**
   * Build the project files in the local `dist` directory. The builder will continue
   * to watch for file changes if the `mode` is set to 'development'. In 'production'
   * builds all output files are optimized/minified.
   */
  async build(mode: 'development' | 'production'): Promise<void> {
    this._project = new Project().setEnvironment(mode)

    this._ensureProjectFiles()
    this._updateConfig()
    this._clearAllDiagnostics()
    this._setGlobals()
    this._populate()
    this._lintTemplates()

    await this._rebuild()

    if (this._project.isDevelopment()) {
      await this._startWatching()
    }
  }

  /**
   * Render and build a project page in the local `dist` directory.
   */
  protected _buildPage(pagePath: string): void {
    let html = this._project.renderForce(pagePath)

    if (this._subdirectory) {
      html = html.replace(/(data|href|srcset|src)="(\/.+)"/g, `$1="/${this._subdirectory}$2"`)
    }

    if (html.startsWith('<html')) {
      html = `<!DOCTYPE html>\n${html}`
    }

    fs.outputFileSync(
      `${this._dist}${pagePath}.html`,
      html.includes('</html>') ? html : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`,
    )
  }

  /**
   * Build the final scripts file in the local `dist` directory.
   */
  protected async _buildScripts(): Promise<void> {
    let results: esbuild.BuildResult
    let code: string

    this._clearDiagnostics(/^src\/(scripts\/|main\.js$)/)

    if (this._esbuild?.rebuild) {
      results = await this._esbuild.rebuild().catch((reason) => reason)
    } else {
      const options: esbuild.BuildOptions = {
        outdir: this._dist,
        bundle: true,
        platform: 'neutral',
        mainFields: ['module', 'main'],
        logLevel: 'silent',
        write: false,
        minify: this._project.isProduction(),
        incremental: this._project.isDevelopment(),
      }

      if (this._project.isProduction()) {
        options.stdin = {
          contents: "import './main.js'\n\n" + this._project.buildScripts(),
          resolveDir: 'src',
          sourcefile: 'components/**/*.html',
        }
      } else {
        options.entryPoints = ['src/main.js']
      }

      results = await esbuild.build(options).catch((reason) => reason)

      if (this._project.isDevelopment()) {
        this._esbuild = results
      }
    }

    if (results.errors.length > 0 || results.warnings.length > 0) {
      results.errors.forEach((error) => {
        this._addDiagnostics({
          message: error.text,
          severity: 'error',
          relativePath: error.location?.file,
          start: [error.location?.line ?? -1, (error.location?.column ?? -2) + 1],
          end: this._getEndLineColumnFromEsbuildLocation(error.location),
        })
      })

      results.warnings.forEach((warning) => {
        this._addDiagnostics({
          message: warning.text,
          severity: 'warning',
          relativePath: warning.location?.file,
          start: [warning.location?.line ?? -1, (warning.location?.column ?? -2) + 1],
          end: this._getEndLineColumnFromEsbuildLocation(warning.location),
        })
      })
    } else {
      code = results.outputFiles![0].text

      if (this._project.isDevelopment()) {
        code += `\n// src/components/**/*.html\n${this._project.buildScripts()}\n`
      }

      fs.outputFileSync(`${this._dist}/${this._getScriptsOutname()}`, code)

      this._emit('stats')
    }
  }

  /**
   * Build the final styles file in the local `dist` directory.
   */
  protected _buildStyles(): void {
    this._clearDiagnostics(/^src\/main\.css$/)._addDiagnostics(
      ...this._project
        .setCustomCSS(fs.readFileSync('src/main.css', 'utf-8'))
        .lintCustomCSS('*')
        .getCustomCSSDiagnostics('*')
        .map((diagnostic) => ({
          ...diagnostic,
          relativePath: 'src/main.css',
        })),
    )

    let css = (this._cssReset ? cssReset.join('\n') : '') + this._project.buildStyles()

    if (this._project.isProduction()) {
      const cleanCSS = new CleanCSS().minify(css)

      if (cleanCSS.errors.length === 0 && cleanCSS.warnings.length === 0) {
        css = cleanCSS.styles
      }
    }

    fs.outputFileSync(`${this._dist}/${this._getStylesOutname()}`, css)

    this._emit('stats')
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
  protected _clearDiagnostics(relativePath: string | RegExp): this {
    let index: number = 0
    let updated: boolean = false

    for (const diagnostic of [...this._diagnostics]) {
      if (
        (typeof relativePath === 'string' && diagnostic.relativePath === relativePath) ||
        (typeof relativePath !== 'string' && relativePath.test(diagnostic.relativePath))
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
   * Format file contents with `prettier`.
   */
  protected _format(relativePath: string): this {
    try {
      const code = fs.readFileSync(relativePath, 'utf-8')
      const formattedCode = format(code, relativePath)

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
  initStarterProject(): void {
    this._ensureProjectFiles()

    fs.outputJsonSync('.vscode/settings.json', starter.vscodeSettingsJSON, { spaces: 2 })
    fs.outputJsonSync('.vscode/frontsail.html-data.json', starter.vscodeFrontsailHtmlDataJSON, {
      spaces: 2,
    })
    fs.outputJsonSync('src/globals.json', starter.srcGlobalsJSON, { spaces: 2 })
    fs.outputFileSync('src/main.js', starter.srcMainJS.join('\n'))
    fs.outputFileSync('src/components/base.html', starter.srcComponentsBaseHTML.join('\n'))
    fs.outputFileSync('src/pages/index.html', starter.srcPagesIndexHTML.join('\n'))
    fs.outputJsonSync('frontsail.config.json', starter.frontsailConfigJSON, { spaces: 2 })
    fs.outputJsonSync('package.json', starter.packageJSON, { spaces: 2 })
    fs.outputFileSync('.gitignore', starter.gitignore.join('\n'))
  }

  /**
   * Lint a component named `componentName` and store its diagnostics if any.
   */
  protected _lintComponent(componentName: string): this {
    this._clearDiagnostics(`src/components/${componentName}.html`)._addDiagnostics(
      ...this._project
        .lintComponent(componentName, '*')
        .getComponentDiagnostics(componentName, '*')
        .map((diagnostic) => ({
          ...diagnostic,
          relativePath: `src/components/${componentName}.html`,
        })),
    )

    return this
  }

  /**
   * Lint a page with the path `pagePath` and store its diagnostics if any.
   */
  protected _lintPage(pagePath: string): this {
    this._clearDiagnostics(`src/pages${pagePath}.html`)._addDiagnostics(
      ...this._project
        .lintPage(pagePath, '*')
        .getPageDiagnostics(pagePath, '*')
        .map((diagnostic) => ({
          ...diagnostic,
          relativePath: `src/pages${pagePath}.html`,
        })),
    )

    return this
  }

  /**
   * Lint all components and pages.
   */
  protected _lintTemplates(): this {
    this._project.listComponents().forEach((componentName) => this._lintComponent(componentName))
    this._project.listPages().forEach((pagePath) => this._lintPage(pagePath))

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
   * Handle file changes from the local `src` directory and project configuration file.
   */
  @bind protected async _onFileChange(
    eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
    relativePath: string,
  ): Promise<void> {
    const normalizedPath = relativePath.replace(/\\/g, '/')

    // Config
    //
    if (normalizedPath === 'frontsail.config.json') {
      if (eventName === 'add' || eventName === 'change') {
        this._format(normalizedPath)
      }

      this._updateConfig(true)
    }
    //
    // Globals
    //
    else if (normalizedPath === 'src/globals.json') {
      if (eventName === 'add' || eventName === 'change') {
        this._format(normalizedPath)
      } else if (eventName === 'unlink') {
        fs.outputJSONSync(normalizedPath, {})
      }

      this._setGlobals(true)
    }
    //
    // Scripts
    //
    else if (normalizedPath === 'src/main.js') {
      if (eventName === 'add' || eventName === 'change') {
        this._format(normalizedPath)
      } else if (eventName === 'unlink') {
        fs.ensureFileSync(normalizedPath)
      }

      await this._buildScripts()
    } else if (normalizedPath.startsWith('src/scripts/')) {
      await this._buildScripts()
    }
    //
    // Styles
    //
    else if (normalizedPath === 'src/main.css') {
      if (eventName === 'add' || eventName === 'change') {
        this._format(normalizedPath)
      } else if (eventName === 'unlink') {
        fs.ensureFileSync(normalizedPath)
      }

      this._buildStyles()
    } else {
      const match = /^src\/(assets|components|pages)\/(.+)$/.exec(normalizedPath)

      if (match) {
        try {
          //
          // Assets
          //
          if (match[1] === 'assets') {
            const assetPath = `/assets/${match[2]}`.toLowerCase()

            if (eventName === 'add' || eventName === 'change') {
              if (this._project.hasAsset(assetPath)) {
                this._clearDiagnostics(normalizedPath)._project.removeAsset(assetPath)
              }

              this._clearDiagnostics(normalizedPath)._project.addAsset(assetPath)
              fs.copySync(relativePath, `${this._dist}${assetPath}`)
            } else if (eventName === 'unlink') {
              this._clearDiagnostics(normalizedPath)._project.removeAsset(assetPath)
              fs.removeSync(`${this._dist}${assetPath}`)
            }
          }
          //
          // Components
          //
          else if (match[1] === 'components' && match[2].endsWith('.html')) {
            const componentName = match[2].replace(/\.html$/, '').toLowerCase()

            if (eventName === 'add' || eventName === 'change') {
              this._format(normalizedPath)

              if (this._project.hasComponent(componentName)) {
                this._project.updateComponent(componentName, fs.readFileSync(relativePath, 'utf-8'))
              } else {
                this._project.addComponent(componentName, fs.readFileSync(relativePath, 'utf-8'))
              }

              this._lintComponent(componentName)
            } else if (eventName === 'unlink') {
              this._clearDiagnostics(normalizedPath)

              try {
                this._project.removeComponent(componentName)
              } catch (_) {}
            }

            this._buildScripts()
            this._buildStyles()

            try {
              const includers = this._project.getIncluders(componentName, true)

              includers.components.forEach((_name) => this._lintComponent(_name))
              includers.pages.forEach((_path) => this._lintPage(_path)._buildPage(_path))
            } catch (_) {}
          }
          //
          // Pages
          //
          else if (match[1] === 'pages' && match[2].endsWith('.html')) {
            const pagePath = '/' + match[2].replace(/\.html$/, '').toLowerCase()

            if (eventName === 'add' || eventName === 'change') {
              this._format(normalizedPath)

              if (this._project.hasPage(pagePath)) {
                this._project.updatePage(pagePath, fs.readFileSync(relativePath, 'utf-8'))
              } else {
                this._project.addPage(pagePath, fs.readFileSync(relativePath, 'utf-8'))
              }

              this._lintPage(pagePath)._buildPage(pagePath)
            } else if (eventName === 'unlink') {
              this._clearDiagnostics(normalizedPath)
              fs.removeSync(`${this._dist}/${match[2]}`)

              try {
                this._project.removePage(pagePath)
              } catch (_) {}
            }

            this._buildStyles()
          }
        } catch (e) {
          if (fs.existsSync(normalizedPath)) {
            this._clearDiagnostics(normalizedPath)._addDiagnostics({
              message: e.message,
              relativePath: normalizedPath,
            })
          }
        }
      }
    }

    this._emit('stats')
  }

  /**
   * Walk through all assets and templates in the `src` directory and register them
   * in the working `Project` instance.
   */
  protected _populate(): void {
    glob.sync('src/assets/**/*').forEach((srcPath) => {
      const assetPath = srcPath.replace('src', '').toLowerCase()

      try {
        this._project.addAsset(assetPath)
      } catch (e) {
        this._addDiagnostics({ relativePath: srcPath, message: e.message })
      }
    })

    glob.sync('src/components/**/*.html').forEach((srcPath) => {
      const relativePath = srcPath.replace('src/', '')
      const componentName = relativePath
        .replace('components/', '')
        .replace(/\.html$/, '')
        .toLowerCase()

      try {
        this._project.addComponent(componentName, fs.readFileSync(srcPath, 'utf-8'))
      } catch (e) {
        this._addDiagnostics({ relativePath: srcPath, message: e.message })
      }
    })

    glob.sync('src/pages/**/*.html').forEach((srcPath) => {
      const relativePath = srcPath.replace('src/', '')
      const pagePath = relativePath
        .replace('pages', '')
        .replace(/\.html$/, '')
        .toLowerCase()

      try {
        this._project.addPage(pagePath, fs.readFileSync(srcPath, 'utf-8'))
      } catch (e) {
        this._addDiagnostics({ relativePath, message: e.message })
      }
    })
  }

  /**
   * Rebuild all `dist` files.
   */
  protected async _rebuild(): Promise<void> {
    this.clearDistDirectory()

    this._project.listAssets().forEach((path) => fs.copySync(`src${path}`, `${this._dist}${path}`))
    this._project.listPages().forEach((path) => this._buildPage(path))

    await this._buildScripts()
    this._buildStyles()
  }

  /**
   * Set the globals variables in the project from the local `globals.json` file.
   */
  protected _setGlobals(rebuild: boolean = false): void {
    const json = fs.readJsonSync('src/globals.json', { throws: false })

    this._clearDiagnostics('src/globals.json')

    if (json && typeof json === 'object') {
      try {
        const globals: { [name: string]: string } = {}

        for (const name in json) {
          if (typeof json[name] === 'string') {
            globals[name] = json[name]
          } else {
            this._addDiagnostics({
              message: `The global variable '${name}' must be strings.`,
              severity: 'warning',
              relativePath: 'src/globals.json',
            })
          }
        }

        this._project.setGlobals(globals)
      } catch (e) {
        this._addDiagnostics({ message: e.message, relativePath: 'src/globals.json' })
      }
    }

    if (rebuild) {
      this._lintTemplates()
      this._rebuild()
    }
  }

  /**
   * Watch for file changes in the `src` directory and add event listeners to handle
   * callbacks from the `chokidar` watcher.
   *
   * Also watch for configuration changes.
   */
  protected async _startWatching(): Promise<void> {
    this._watcher = chokidar
      .watch(['src/**/*', 'frontsail.config.json'], {
        awaitWriteFinish: { stabilityThreshold: 50 },
        ignoreInitial: true,
      })
      .on('all', this._onFileChange)
  }

  /**
   * Stop the build process by deregistering all watchers and closing their processes.
   * Works only if the build method was called in 'development' mode.
   */
  async stop(): Promise<void> {
    if (this._project.isDevelopment()) {
      await this._stopWatching()
    }
  }

  /**
   * Remove listeners from all watchers and close them afterwards.
   */
  protected async _stopWatching(): Promise<void> {
    // Stop `Chokidar` watcher
    if (this._watcher) {
      this._watcher.off('all', this._onFileChange)
      await this._watcher.close()
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
  protected _updateConfig(rebuildOnChange: boolean = false): void {
    const json = fs.readJsonSync('frontsail.config.json', { throws: false })

    // @todo JSON AST
    if (json && typeof json === 'object') {
      for (const option in json) {
        //
        // Subdirectory
        //
        if (option === 'subdirectory' && typeof json[option] === 'string') {
          const subdirectory = json[option].replace(/^\//, '').replace(/\/$/, '')

          if (subdirectory !== this._subdirectory) {
            this._subdirectory = subdirectory
            this._dist = `dist/${this._subdirectory}`

            if (rebuildOnChange) {
              this._rebuild()
            }
          }
        }
        //
        // CSS reset
        //
        else if (option === 'cssReset' && typeof json[option] === 'boolean') {
          if (this._cssReset !== json[option]) {
            this._cssReset = json[option]

            if (rebuildOnChange) {
              this._buildStyles()
            }
          }
        }
      }
    }
  }
}
