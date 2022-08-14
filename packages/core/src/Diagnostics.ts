import { clearArray } from '@frontsail/utils'
import { Diagnostic } from './types/code'

/**
 * Abstract class for managing code diagnostics organized by types.
 */
export abstract class Diagnostics<T extends { [K in keyof T]: Diagnostic[] }> {
  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: T

  /**
   * Clear diagnostics specified in `types`. Use a wildcard (`*`) to clear them all.
   */
  clearDiagnostics(...types: [keyof T | '*', ...(keyof T | '*')[]]): this {
    for (const type in this._diagnostics) {
      if (types.includes('*') || types.includes(type)) {
        clearArray(this._diagnostics[type])
      }
    }

    return this
  }

  /**
   * Get diagnostics of specific `types`. Use a wildcard (`*`) to get them all.
   */
  getDiagnostics(...types: [keyof T | '*', ...(keyof T | '*')[]]): Diagnostic[] {
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
  getDiagnosticsWithOffset(
    offset: number = 0,
    ...types: [keyof T | '*', ...(keyof T | '*')[]]
  ): Diagnostic[] {
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
  hasProblems(...types: [keyof T | '*', ...(keyof T | '*')[]]): boolean {
    for (const type in this._diagnostics) {
      if ((types.includes('*') || types.includes(type)) && !!this._diagnostics[type].length) {
        return true
      }
    }

    return false
  }
}
