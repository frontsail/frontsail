import { Diagnostic } from '@frontsail/core'

/**
 * Describes a diagnostic related to a source file.
 */
export interface FileDiagnostic extends Diagnostic {
  /**
   * The relative path of the file in the local `src` directory.
   */
  relativePath: string

  /**
   * The start position in the code described with a line-column pair.
   */
  start: [line: number, column: number]

  /**
   * The end position in the code described with a line-column pair.
   */
  end: [line: number, column: number]

  /**
   * Formatted code excerpt focused on the problematic code range.
   */
  preview: string

  /**
   * A source reference for the diagnostic used when filtering.
   */
  source: 'core' | 'wright'
}
