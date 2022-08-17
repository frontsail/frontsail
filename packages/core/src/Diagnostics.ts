import { clearArray } from '@frontsail/utils'
import { Diagnostic } from './types/code'
import { AtLeastOne } from './types/generic'

/**
 * Abstract class for managing code diagnostics organized by types.
 */
export abstract class Diagnostics<T extends { [K in keyof T]: Diagnostic[] }> {
  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: T

  /**
   * Store `diagnostics` of a specific `type`.
   */
  addDiagnostics(type: keyof T, ...diagnostics: Diagnostic[]): this {
    this._diagnostics[type].push(...diagnostics)
    return this
  }

  /**
   * Store `diagnostics` of a specific `type`. Unknown `types` are ignored.
   */
  addUnknownDiagnostics(type: string | number | symbol, ...diagnostics: Diagnostic[]): this {
    if (this._diagnostics.hasOwnProperty(type)) {
      this.addDiagnostics(type as keyof T, ...diagnostics)
    }

    return this
  }

  /**
   * Clear diagnostics of specific `types`. Use a wildcard (`*`) to clear all.
   */
  clearDiagnostics(...types: AtLeastOne<T>): this {
    for (const type in this._diagnostics) {
      if (types.includes('*') || types.includes(type)) {
        clearArray(this._diagnostics[type])
      }
    }

    return this
  }

  /**
   * Filter a list of `tests` to include only those specific to the class.
   */
  filterTests(tests: any[]): (keyof T)[] {
    const types = Object.keys(this._diagnostics) as (keyof T)[]

    if (tests.includes('*')) {
      return types
    }

    return types.filter((type) => tests.includes(type))
  }

  /**
   * Get diagnostics of specific `types`. Use a wildcard (`*`) to get diagnostics
   * of all types.
   */
  getDiagnostics(...types: AtLeastOne<T>): Diagnostic[] {
    const diagnostics: Diagnostic[] = []

    for (const type in this._diagnostics) {
      if (types.includes('*') || types.includes(type)) {
        diagnostics.push(...this._diagnostics[type])
      }
    }

    return diagnostics
  }

  /**
   * Get diagnostics of specific `types` and apply an `offset` that is added to
   * all returned diagnostic ranges. Use a wildcard (`*`) to get all diagnostics.
   */
  getDiagnosticsWithOffset(offset: number = 0, ...types: AtLeastOne<T>): Diagnostic[] {
    return this.getDiagnostics(...types).map((diagnostic) => ({
      ...diagnostic,
      from: diagnostic.from + offset,
      to: diagnostic.to + offset,
    }))
  }

  /**
   * Check if there are any diagnostics of specific `types`. Use a wildcard (`*`)
   * to check all types.
   */
  hasProblems(...types: AtLeastOne<T>): boolean {
    for (const type in this._diagnostics) {
      if ((types.includes('*') || types.includes(type)) && this._diagnostics[type].length > 0) {
        return true
      }
    }

    return false
  }

  /**
   * Should analyze some code and run the specified `_tests`. A wildcard (`*`) can be
   * used to run all types of tests.
   */
  lint(..._tests: AtLeastOne<T>): this {
    return this
  }

  /**
   * Determines whether a `test` is included in a collection of `tests`.
   */
  shouldTest(test: keyof T | '*', tests: (keyof T | '*')[]): boolean {
    return tests.includes('*') || tests.includes(test)
  }

  /**
   * Run `tests` in another instance of `Diagnostics` and merge their diagnostics
   * into this instance.
   */
  testAndMergeDiagnostics<U extends { [K in keyof U]: Diagnostic[] }>(
    instance: Diagnostics<U>,
    ...tests: AtLeastOne<T>
  ): this {
    const instanceTests = instance.filterTests(tests)

    if (instanceTests.length > 0) {
      instance.lint(instanceTests[0], ...instanceTests.slice(1))

      for (const test of instanceTests) {
        this.addUnknownDiagnostics(test, ...instance.getDiagnostics(test))
      }
    }

    return this
  }
}
