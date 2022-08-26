import { CSS } from './CSS'
import { Diagnostics } from './Diagnostics'
import { JS } from './JS'
import { Diagnostic } from './types/code'
import { AtLeastOne } from './types/generic'
import { CustomCSSDiagnostics, CustomJSDiagnostics } from './types/project'

/**
 * Abstract class for managing custom CSS and JS diagnostics organized by types.
 */
export abstract class ProjectDiagnostics {
  /**
   * Custom CSS code.
   */
  protected _css: string

  /**
   * Custom JS code.
   */
  protected _js: string

  /**
   * Custom CSS diagnostics instance.
   */
  protected _cssDiagnostics: Diagnostics<CustomCSSDiagnostics>

  /**
   * Custom JS diagnostics instance.
   */
  protected _jsDiagnostics: Diagnostics<CustomJSDiagnostics>

  /**
   * Instantiate with `Diagnostics` instances for custom CSS and JS code.
   */
  constructor() {
    this._cssDiagnostics = new (class extends Diagnostics<CustomCSSDiagnostics> {
      /**
       * Collection of diagnostics for custom CSS code organized by types.
       */
      protected _diagnostics: CustomCSSDiagnostics = {
        logical: [],
        syntax: [],
      }
    })()

    this._jsDiagnostics = new (class extends Diagnostics<CustomJSDiagnostics> {
      /**
       * Collection of diagnostics for custom JS code organized by types.
       */
      protected _diagnostics: CustomJSDiagnostics = {
        runtime: [],
        syntax: [],
      }
    })()
  }

  /**
   * Store custom CSS `diagnostics` of a specific `type`.
   */
  addCustomCSSDiagnostics(type: keyof CustomCSSDiagnostics, ...diagnostics: Diagnostic[]): this {
    this._cssDiagnostics.addDiagnostics(type, ...diagnostics)
    return this
  }

  /**
   * Store custom JS `diagnostics` of a specific `type`.
   */
  addCustomJSDiagnostics(type: keyof CustomJSDiagnostics, ...diagnostics: Diagnostic[]): this {
    this._jsDiagnostics.addDiagnostics(type, ...diagnostics)
    return this
  }

  /**
   * Clear custom CSS diagnostics of specific `types`. Use a wildcard (`*`) to clear all.
   */
  clearCustomCSSDiagnostics(...types: AtLeastOne<CustomCSSDiagnostics>): this {
    this._cssDiagnostics.clearDiagnostics(...types)
    return this
  }

  /**
   * Clear custom JS diagnostics of specific `types`. Use a wildcard (`*`) to clear all.
   */
  clearCustomJSDiagnostics(...types: AtLeastOne<CustomJSDiagnostics>): this {
    this._jsDiagnostics.clearDiagnostics(...types)
    return this
  }

  /**
   * Get custom CSS diagnostics of specific `types`. Use a wildcard (`*`) to get
   * diagnostics of all types.
   */
  getCustomCSSDiagnostics(...types: AtLeastOne<CustomCSSDiagnostics>): Diagnostic[] {
    return this._cssDiagnostics.getDiagnostics(...types)
  }

  /**
   * Get custom JS diagnostics of specific `types`. Use a wildcard (`*`) to get
   * diagnostics of all types.
   */
  getCustomJSDiagnostics(...types: AtLeastOne<CustomJSDiagnostics>): Diagnostic[] {
    return this._jsDiagnostics.getDiagnostics(...types)
  }

  /**
   * Check if there are any custom CSS diagnostics of specific `types`. Use a wildcard
   * (`*`) to check all types.
   */
  customCSSHasProblems(...types: AtLeastOne<CustomCSSDiagnostics>): boolean {
    return this._cssDiagnostics.hasProblems(...types)
  }

  /**
   * Check if there are any custom JS diagnostics of specific `types`. Use a wildcard
   * (`*`) to check all types.
   */
  customJSHasProblems(...types: AtLeastOne<CustomJSDiagnostics>): boolean {
    return this._jsDiagnostics.hasProblems(...types)
  }

  /**
   * Analyze the custom CSS code by running specified `tests`. Use a wildcard (`*`)
   * to run all types of tests. Diagnostics can be retrieved with the method
   * `getCustomCSSDiagnostics()`.
   */
  lintCustomCSS(...tests: AtLeastOne<CustomCSSDiagnostics>): this {
    const css = new CSS(this._css)

    this.clearCustomCSSDiagnostics(...tests).addCustomCSSDiagnostics(
      'syntax',
      ...css.getDiagnostics('syntax'),
    )

    if (!this.customCSSHasProblems('syntax')) {
      this.addCustomCSSDiagnostics('logical', ...css.lint().getDiagnostics('logical'))

      // Check global variables
      //
      css.getGlobals().forEach((global) => {
        if (!(this as any).hasGlobal(global.variable)) {
          this.addCustomCSSDiagnostics('logical', {
            message: 'Global variable does not exist.',
            severity: 'warning',
            from: global.from,
            to: global.to,
          })
        }
      })
      //
      // Check modifiers
      //
      css.getModifiers().forEach((modifier) => {
        this.addCustomCSSDiagnostics('logical', {
          message: 'Modifiers can only be used in components.',
          severity: 'warning',
          from: modifier.from,
          to: modifier.to,
        })
      })
    }

    return this
  }

  /**
   * Analyze the custom JS code by running specified `tests`. Use a wildcard (`*`)
   * to run all types of tests. Diagnostics can be retrieved with the method
   * `getCustomJSDiagnostics()`.
   */
  lintCustomJS(...tests: AtLeastOne<CustomJSDiagnostics>): this {
    const js = new JS(this._js)

    this.clearCustomJSDiagnostics(...tests).addCustomJSDiagnostics(
      'syntax',
      ...js.getDiagnostics('syntax'),
    )

    return this
  }
}
