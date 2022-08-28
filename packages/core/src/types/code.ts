/**
 * Describes a part of a code with its range.
 */
export interface CodePart extends Range {
  /**
   * The code part text.
   */
  text: string
}

/**
 * Describes a problem or hint for a piece of code with a message, severity,
 * and its range in the source code.
 */
export interface Diagnostic extends Range {
  /**
   * The message associated with this diagnostic.
   */
  message: string

  /**
   * Errors are red, warnings are yellow.
   */
  severity: 'warning' | 'error'
}

/**
 * Describes a range of a text in a code.
 */
export interface Range {
  /**
   * The start position of the text in the code, starting at 0.
   */
  from: number

  /**
   * The ending position of the text in the code.
   */
  to: number
}

/**
 * Describes a diagnostic related to a template.
 */
export interface RenderDiagnostic extends Diagnostic {
  /**
   * A component name or page path related to the diagnostic.
   */
  templateId: string
}
