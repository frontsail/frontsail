import { codeFrameColumns } from '@babel/code-frame'
import { isGlobalName, isPagePath, JSON as JSONAST, Project } from '@frontsail/core'
import {
  bind,
  camelize,
  clearArray,
  debounce,
  fillObject,
  lineColumnToOffset,
  offsetToLineColumn,
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
  protected _buildHash: string = customAlphabet('01234567890abcdefghijklmnopqrstuvwxyz', 10)()

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
   * List of page paths with duplicate source entries.
   */
  protected _duplicatePagePaths: string[] = []

  /**
   * Event emitter instance.
   */
  events = new EventEmitter()

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
      html = html.replace(/(data|href|srcset|src)="(\/.+)"/g, `$1="/${this._subdirectory}$2"`)
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
        .map((diagnostic) => ({
          ...diagnostic,
          relativePath: 'src/main.css',
        })),
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
        (typeof relativePath === 'string' &&
          diagnostic.relativePath.toLowerCase() === relativePath.toLowerCase()) ||
        (typeof relativePath !== 'string' &&
          relativePath.test(diagnostic.relativePath.toLowerCase()))
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
  protected _lintPage(pagePath: string, relativePath?: string): this {
    if (typeof relativePath !== 'string') {
      if (pagePath === '/') {
        relativePath = 'src/pages/index.html'
      } else if (fs.existsSync(`src/pages${pagePath}/index.html`)) {
        relativePath = `src/pages${pagePath}/index.html`
      } else if (fs.existsSync(`src/pages${pagePath}.html`)) {
        relativePath = `src/pages${pagePath}.html`
      } else {
        relativePath = `~${pagePath}`
      }
    }

    this._clearDiagnostics(relativePath)._addDiagnostics(
      ...this._project
        .lintPage(pagePath, '*')
        .getPageDiagnostics(pagePath, '*')
        .map((diagnostic) => ({
          ...diagnostic,
          relativePath,
        })),
    )

    return this
  }

  /**
   * Lint all components and pages.
   */
  lintTemplates(): this {
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
   * Create a new FrontSail project.
   */
  newProject(mode: 'development' | 'production'): void {
    this._project = new Project().setEnvironment(mode)
  }

  /**
   * Handle file changes from the local `src` directory and project configuration files.
   */
  @bind protected async _onFileChange(
    eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
    relativePath: string,
  ): Promise<void> {
    const normalizedPath = relativePath.replace(/\\/g, '/')

    // Project files
    //
    if (
      ['frontsail.build.js', 'package.json'].includes(normalizedPath) ||
      /^src\/scripts\/.+\.js$/.test(normalizedPath)
    ) {
      if (eventName === 'add' || eventName === 'change') {
        this._format(normalizedPath)
      }
    }
    //
    // Config
    //
    if (normalizedPath === 'frontsail.config.json') {
      if (eventName === 'add' || eventName === 'change') {
        this._format(normalizedPath)
      }

      this.updateConfig(true)
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

      this.setGlobals(true)
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
            const assetPath = `/assets/${match[2]}`

            if (eventName === 'add' || eventName === 'change') {
              if (this._project.hasAsset(assetPath)) {
                this._clearDiagnostics(normalizedPath)._project.removeAsset(assetPath)
              }

              this._clearDiagnostics(normalizedPath)._project.addAsset(assetPath)
              fs.copySync(relativePath, `${this._dist}${assetPath}`)
            } else if (eventName === 'unlink') {
              this._clearDiagnostics(normalizedPath)._project.removeAsset(assetPath)
              this._removeBubble(`${this._dist}${assetPath}`)
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
              includers.pages.forEach((_path) => this._lintPage(_path).buildPage(_path))
            } catch (_) {}
          }
          //
          // Pages
          //
          else if (match[1] === 'pages' && match[2].endsWith('.html')) {
            const uniqueRelativePath = this._resolveRelativePagePath(match[2])
            const pagePath = filePathToPagePath(match[2], true)!

            if (eventName === 'add' || eventName === 'change') {
              this._format(uniqueRelativePath)

              if (this._project.hasPage(pagePath)) {
                this._project.updatePage(pagePath, fs.readFileSync(uniqueRelativePath, 'utf-8'))
              } else {
                this._project.addPage(pagePath, fs.readFileSync(uniqueRelativePath, 'utf-8'))
              }

              this._lintPage(pagePath).buildPage(pagePath)
            } else if (eventName === 'unlink') {
              this._clearDiagnostics(uniqueRelativePath)
              this._removeBubble(`${this._dist}/${pagePathToFilePath(pagePath)}`)

              try {
                this._project.removePage(pagePath)
                this._resolveRelativePagePath(match[2])
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
  populate(): void {
    glob.sync('src/assets/**/*').forEach((srcPath) => {
      const assetPath = srcPath.replace('src', '').toLowerCase()

      try {
        this._project.addAsset(assetPath)
      } catch (e) {
        this._addDiagnostics({ relativePath: srcPath, message: e.message })
      }
    })

    glob.sync('src/components/**/*.html').forEach((srcPath) => {
      const componentName = srcPath
        .replace('src/components/', '')
        .replace(/\.html$/, '')
        .toLowerCase()

      try {
        this._project.addComponent(componentName, fs.readFileSync(srcPath, 'utf-8'))
      } catch (e) {
        this._addDiagnostics({ relativePath: srcPath, message: e.message })
      }
    })

    glob.sync('src/pages/**/*.html').forEach((srcPath) => {
      try {
        const relativeFilePath = srcPath.replace('src/pages/', '')
        const pagePath = filePathToPagePath(relativeFilePath)!
        const uniqueSrcPath = this._resolveRelativePagePath(relativeFilePath)

        try {
          this._project.addPage(pagePath, fs.readFileSync(uniqueSrcPath, 'utf-8'))
        } catch (e) {
          this._addDiagnostics({ relativePath: uniqueSrcPath, message: e.message })
        }
      } catch (e) {
        this._clearDiagnostics(srcPath)._addDiagnostics({
          message: e.message,
          relativePath: srcPath,
        })
      }
    })
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
   */
  removeCustomPage(pagePath: string): void {
    this._clearDiagnostics(`~${pagePath}`)

    if (isPagePath(pagePath)) {
      this._removeBubble(`${this._dist}/${pagePathToFilePath(pagePath)}`)
    }

    try {
      this._project.removePage(pagePath)
    } catch (_) {}
  }

  /**
   * Remove a file or directory by its `path` and its empty parent directories recursively.
   */
  protected _removeBubble(path: string): void {
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
  }

  /**
   * Get the unique relative page path from two possible sources (e.g. 'src/foo.html'
   * and 'src/foo/index.html').
   *
   * @throws an error if another relative path exists for the same page.
   */
  protected _resolveRelativePagePath(
    relativeFilePath: string,
    clearDiagnostics: boolean = true,
    fixDuplicates: boolean = true,
  ): string {
    const pagePath = filePathToPagePath(relativeFilePath)

    if (fixDuplicates) {
      this._duplicatePagePaths.slice().forEach((duplicatePagePath) => {
        try {
          if (!this._project.hasPage(duplicatePagePath)) {
            const filePath = pagePathToFilePath(duplicatePagePath)!
            const relativePath = this._resolveRelativePagePath(filePath, false, false)
            const index = this._duplicatePagePaths.indexOf(duplicatePagePath)
            this._duplicatePagePaths.splice(index, 1)

            try {
              this._project.addPage(duplicatePagePath, fs.readFileSync(relativePath, 'utf-8'))
              this._lintPage(duplicatePagePath).buildPage(duplicatePagePath)
            } catch (e) {
              this._addDiagnostics({ relativePath, message: e.message })
            }
          }
        } catch (_) {}
      })
    }

    if (pagePath && pagePath !== '/' && !pagePath.endsWith('/index')) {
      const filePath = pagePathToFilePath(pagePath)!
      const first = `src/pages/${filePath}`
      const second = first.replace(/\/index\.html$/, '.html')
      const firstExists = fs.existsSync(first)
      const secondExists = fs.existsSync(second)

      if (clearDiagnostics) {
        this._clearDiagnostics(first)
        this._clearDiagnostics(second)
      }

      if (firstExists && secondExists) {
        if (!this._duplicatePagePaths.includes(pagePath)) {
          this._duplicatePagePaths.push(pagePath)
        }

        this._removeBubble(`${this._dist}/${filePath}`)

        throw new Error(`Duplicate page paths: '${first}' and '${second}'.`)
      } else if (firstExists) {
        return first
      } else if (secondExists) {
        return second
      }
    }

    return `src/pages/${relativeFilePath}`
  }

  /**
   * Add or update a single custom page.
   */
  setCustomPage(pagePath: string, html: string): void {
    try {
      if (this._project.hasPage(pagePath)) {
        this._project.updatePage(pagePath, html)
      } else {
        this._project.addPage(pagePath, html)
      }

      this._lintPage(pagePath, `~${pagePath}`)
    } catch (e) {
      this._addDiagnostics({ relativePath: `~${pagePath}`, message: e.message })
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
          this.lintTemplates()
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
    this.lintTemplates()

    await this.rebuild()

    if (this._project.isDevelopment()) {
      await this._startWatching()
    }
  }

  /**
   * Watch for file changes in the `src` directory and add event listeners to handle
   * callbacks from the `chokidar` watcher.
   *
   * Also watch for configuration files.
   */
  protected async _startWatching(): Promise<void> {
    this._watcher = chokidar
      .watch(['src/**/*', 'frontsail.config.json', 'frontsail.build.js', 'package.json'], {
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
