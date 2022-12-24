import {
  Bind,
  clearArray,
  debounceParallel,
  fillObjectDeep,
  lineColumnToOffset,
  offsetToLineColumn,
} from '@frontsail/utils'
import esbuild from 'esbuild'
import fs from 'fs-extra'
import path from 'path'
import pc from 'picocolors'
import prettyMs from 'pretty-ms'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import ts from 'typescript'
import { ScriptOptions } from './script.types'
import { codeFrame, log } from './utils'

export class Script {
  protected options: ScriptOptions

  /**
   * Whether to build declarations using the TypeScript compiler.
   *
   * Conditions:
   * - The entry file name must have the extension `.ts`
   * - The `declarations` option must be `true`.
   */
  protected buildDeclarations: boolean = false

  /**
   * Only available when watch mode is enabled.
   */
  protected esbuildStop?: () => void
  protected tscStop?: () => void
  protected esbuildRestartNeeded: boolean = false

  /**
   * Used for measuring build times.
   */
  protected esbuildStopwatch: number = 0
  protected tscStopwatch: number = 0

  /**
   * Returns `true` if the build was successful and `false` if not.
   */
  get complete$(): Observable<boolean> {
    return this._complete$.asObservable()
  }

  protected _complete$ = new Subject<boolean>()

  /**
   * The build success state.
   */
  get success$(): Observable<boolean> {
    return this._success$.asObservable()
  }

  protected _success$ = new BehaviorSubject<boolean>(true)
  protected esbuildSuccess: boolean = true
  protected tscSuccess: boolean = true

  /**
   * Esbuild errors that need to be displayed if the TypeScript compiler builds
   * with no errors. The errors come usually from a misconfigured `external`
   * option.
   */
  protected unresolvedEsbuildErrors: esbuild.Message[] = []

  /**
   * The current build state (`true` if the compiler is currently building the
   * script and `false` if not).
   */
  get building$(): Observable<number> {
    return this._building$.asObservable()
  }

  protected _building$ = new BehaviorSubject<number>(0)

  constructor(options: ScriptOptions) {
    this.options = fillObjectDeep(options, {
      ...options,

      // Default options
      target:
        options.platform === 'browser'
          ? 'es2020'
          : options.platform === 'node'
          ? 'node16.3.0'
          : undefined,
      name: path.relative(process.cwd(), options.input),
      watch: false,
      minify: 'auto',
      external: [],
      emptyOutputDir: false,
      declarations: true,
      silent: false,
      completeDebounce: 50,
    })

    this.buildDeclarations = this.options.input.endsWith('.ts') && this.options.declarations!
  }

  /**
   * Start the build process.
   */
  build(): this {
    if (this.options.emptyOutputDir) {
      fs.emptyDirSync(path.dirname(this.options.output))

      if (this.buildDeclarations) {
        const config = this.getTsconfig()

        if (config.options.outDir) {
          fs.emptyDirSync(config.options.outDir)
        }
      }
    }

    this.startEsbuild()

    if (this.buildDeclarations) {
      this.startTsc()
    }

    return this
  }

  protected startEsbuild(): void {
    const options: esbuild.BuildOptions = {
      entryPoints: [this.options.input],
      outfile: this.options.output,
      bundle: true,
      platform: this.options.platform,
      target: this.options.target,
      watch: this.options.watch
        ? {
            onRebuild: (error, result) => {
              if (error) {
                this.onEsbuildFailure(error)
              } else if (result) {
                this.onEsbuildResult(result)
              }
            },
          }
        : false,
      minify: this.options.minify === 'auto' ? !this.options.watch : this.options.minify,
      mainFields: ['module', 'main'],
      external: this.options.external,
      logLevel: 'silent',
      plugins: [
        {
          name: '@frontsail/build',
          setup: (build) => {
            build.onStart(() => {
              this.esbuildStopwatch = performance.now()
              this._building$.next(this._building$.getValue() + 1)

              if (!this.buildDeclarations) {
                this.logInfo('build started...')
              }
            })

            build.onEnd(() => {
              this._building$.next(this._building$.getValue() - 1)
              this.esbuildStopwatch = performance.now() - this.esbuildStopwatch

              if (!this.buildDeclarations) {
                setTimeout(() => {
                  if (this.esbuildSuccess) {
                    this.logSuccess(`build completed in ${prettyMs(this.esbuildStopwatch)}`)
                  } else {
                    this.logError(`build completed in ${prettyMs(this.esbuildStopwatch)}`)
                  }
                })
              }
            })
          },
        },
      ],
    }

    esbuild
      .build(options)
      .then(this.onEsbuildResult)
      .catch((result: esbuild.BuildFailure) => {
        if (result.errors?.length) {
          this.onEsbuildFailure(result)
        } else if (result.message) {
          this.logError(pc.bold(pc.red('configuration error: ')) + result.message)
          this.handleState({ esbuildSuccess: false })
        }

        this.esbuildRestartNeeded = true
      })
  }

  protected startTsc(): void {
    if (this.buildDeclarations) {
      const config = this.getTsconfig()

      if (this.options.watch) {
        const host = ts.createWatchCompilerHost(
          config.path,
          {},
          ts.sys,
          ts.createEmitAndSemanticDiagnosticsBuilderProgram,
          this.onTscDiagnostic,
          this.onTscWatchStatus,
        )

        const origCreateProgram = host.createProgram

        host.createProgram = (rootNames: ReadonlyArray<string>, options, host, oldProgram) => {
          return origCreateProgram(rootNames, options, host, oldProgram)
        }

        const origPostProgramCreate = host.afterProgramCreate

        host.afterProgramCreate = (program) => {
          origPostProgramCreate!(program)
        }

        this.tscStop = ts.createWatchProgram(host).close
      } else {
        this.tscStopwatch = performance.now()

        this.logInfo('build started...')

        const program = ts.createProgram({
          options: config.options,
          rootNames: config.fileNames,
          configFileParsingDiagnostics: config.errors,
        })
        const { diagnostics } = program.emit()
        const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(diagnostics, config.errors)

        this.tscStopwatch = performance.now() - this.tscStopwatch

        allDiagnostics.forEach(this.onTscDiagnostic)

        this.handleState({ tscSuccess: !allDiagnostics.length })

        if (this.tscSuccess) {
          this.logSuccess(`build completed in ${prettyMs(this.tscStopwatch)}`)
        } else {
          this.logError(`build completed in ${prettyMs(this.tscStopwatch)}`)
        }
      }
    }
  }

  protected getTsconfig(): {
    path: string
    options: ts.CompilerOptions
    fileNames: string[]
    errors: ts.Diagnostic[]
  } {
    const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json')

    if (!configPath) {
      throw new Error("Could not find a valid 'tsconfig.json'.")
    }

    const { config } = ts.readConfigFile(configPath, ts.sys.readFile)
    const { options, fileNames, errors } = ts.parseJsonConfigFileContent(config, ts.sys, './')

    return { path: configPath, options, fileNames, errors }
  }

  /**
   * Stop the build process (works only when watch mode is enabled).
   */
  stop(): this {
    this.esbuildStop?.call(null)
    this.tscStop?.call(null)

    return this
  }

  @Bind
  protected onEsbuildResult(result: esbuild.BuildResult): void {
    this.handleEsbuildProblems(result)

    if (this.options.watch) {
      this.esbuildStop = result.stop
    }
  }

  protected onEsbuildFailure(result: esbuild.BuildFailure): void {
    this.handleEsbuildProblems(result)
  }

  @Bind
  protected onTscDiagnostic(diagnostic: ts.Diagnostic): void {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

    if (
      diagnostic.file?.fileName &&
      diagnostic.start !== undefined &&
      diagnostic.length !== undefined
    ) {
      const code = fs.existsSync(diagnostic.file.fileName)
        ? fs.readFileSync(diagnostic.file.fileName, 'utf-8')
        : ''
      const { start, end } = offsetToLineColumn(
        code,
        diagnostic.start,
        diagnostic.start + diagnostic.length,
      )

      this.logCodeError(message, diagnostic.file?.fileName, start, end)
    } else {
      this.logError(message)
    }
  }

  @Bind
  protected onTscWatchStatus(
    diagnostic: ts.Diagnostic,
    _newLine: string,
    _options: ts.CompilerOptions,
    errorCount?: number,
  ): void {
    this.handleState({ tscSuccess: !errorCount })

    if ([6031, 6032].includes(diagnostic.code)) {
      this.tscStopwatch = performance.now()
      this.logInfo('build started...')
      this._building$.next(this._building$.getValue() + 1)
    } else if ([6193, 6194].includes(diagnostic.code)) {
      this._building$.next(this._building$.getValue() - 1)
      this.tscStopwatch = performance.now() - this.tscStopwatch

      if (this.tscSuccess) {
        if (this.esbuildSuccess) {
          this.logSuccess(`build completed in ${prettyMs(this.tscStopwatch)}`)
        } else {
          this.logWarning(`build completed in ${prettyMs(this.tscStopwatch)}`)
        }

        // Check if `esbuild` is having trouble starting
        if (this.esbuildRestartNeeded) {
          this.esbuildRestartNeeded = false
          clearArray(this.unresolvedEsbuildErrors)
          this.handleState({ esbuildSuccess: true })
          this.esbuildStop?.call(null)
          this.startEsbuild()
        }

        // Handle unresolved `esbuild` errors like `external` configuration
        else {
          this.unresolvedEsbuildErrors.forEach((error) => {
            if (error.location && error.location.file) {
              const code = fs.existsSync(error.location.file)
                ? fs.readFileSync(error.location.file, 'utf-8')
                : ''
              const { from } = lineColumnToOffset(code, [
                error.location.line,
                error.location.column,
              ])
              const { start, end } = offsetToLineColumn(code, from, from + error.location.length)

              this.logCodeError(error.text, error.location.file, start, end)
            } else {
              this.logError(error.text)
            }
          })
        }
      } else {
        this.logError(`build completed in ${prettyMs(this.tscStopwatch)}`)
      }
    }
  }

  protected handleEsbuildProblems(result: esbuild.BuildResult): void {
    if (result.errors.length || result.warnings.length) {
      if (this.buildDeclarations) {
        this.unresolvedEsbuildErrors.push(...result.errors)
      } else {
        result.errors.forEach((error) => {
          if (error.location && error.location.file) {
            const code = fs.existsSync(error.location.file)
              ? fs.readFileSync(error.location.file, 'utf-8')
              : ''
            const { from } = lineColumnToOffset(code, [error.location.line, error.location.column])
            const { start, end } = offsetToLineColumn(code, from, from + error.location.length)

            this.logCodeError(error.text, error.location.file, start, end)
          } else {
            this.logError(error.text)
          }
        })

        result.warnings.forEach((warning) => {
          if (warning.location && warning.location.file) {
            const code = fs.existsSync(warning.location.file)
              ? fs.readFileSync(warning.location.file, 'utf-8')
              : ''
            const { from } = lineColumnToOffset(code, [
              warning.location.line,
              warning.location.column,
            ])
            const { start, end } = offsetToLineColumn(code, from, from + warning.location.length)

            this.logCodeWarning(warning.text, warning.location.file, start, end)
          } else {
            this.logWarning(warning.text)
          }
        })
      }

      this.handleState({ esbuildSuccess: false })
    } else {
      clearArray(this.unresolvedEsbuildErrors)
      this.handleState({ esbuildSuccess: true })
    }
  }

  protected handleState(state: { esbuildSuccess?: boolean; tscSuccess?: boolean }): void {
    this.esbuildSuccess = state.esbuildSuccess ?? this.esbuildSuccess
    this.tscSuccess = state.tscSuccess ?? this.tscSuccess

    const success = this.esbuildSuccess && this.tscSuccess

    if (success !== this._success$.getValue()) {
      this._success$.next(success)
    }

    this.onComplete()
  }

  protected onComplete(): void {
    const success = this._success$.getValue()

    debounceParallel(
      this.options.name!,
      () => this._complete$.next(success),
      this.options.completeDebounce,
    )
  }

  protected logInfo(text: string): void {
    if (!this.options.silent) {
      log({ text, subject: this.options.name, timestamp: Date.now() })
    }
  }

  protected logSuccess(text: string): void {
    if (!this.options.silent) {
      log({ text, subject: this.options.name, timestamp: Date.now(), color: 'green' })
    }
  }

  protected logError(text: string): void {
    if (!this.options.silent) {
      log({ text, subject: this.options.name, timestamp: Date.now(), color: 'red' })
    }
  }

  protected logWarning(text: string): void {
    if (!this.options.silent) {
      log({ text, subject: this.options.name, timestamp: Date.now(), color: 'yellow' })
    }
  }

  protected logCodeError(
    text: string,
    file?: string,
    start?: [line: number, column: number],
    end?: [line: number, column: number],
  ): void {
    if (!this.options.silent) {
      console.log('')
      console.log(pc.bold(pc.red('Error:')), pc.red(text))

      if (file && start && end) {
        codeFrame(file, start, end, 'error')
        console.log('')
      }
    }
  }

  protected logCodeWarning(
    text: string,
    file?: string,
    start?: [line: number, column: number],
    end?: [line: number, column: number],
  ): void {
    if (!this.options.silent) {
      console.log('')
      console.log(pc.bold(pc.yellow('Warning:')), pc.yellow(text))

      if (file && start && end) {
        codeFrame(file, start, end, 'warning')
        console.log('')
      }
    }
  }
}
