import { CodePart, Diagnostic } from './code'

/**
 * Describes a collection of diagnostics for a CSS AST organized by types (object keys).
 */
export interface CSSDiagnostics {
  logical: Diagnostic[]
  syntax: Diagnostic[]
}

/**
 * Describes a class name modifier with its range in the code.
 */
export interface Modifier extends CodePart {
  /**
   * The modifier name.
   */
  name: string
}

/**
 * Describes a SCSS variable with its range in the code.
 */
export interface SCSSVariable extends CodePart {
  /**
   * The SCSS variable name.
   */
  variable: string
}
