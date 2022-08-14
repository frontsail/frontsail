import { Diagnostic } from './code'

/**
 * Describes a collection of diagnostics for a JS AST organized by types (object key).
 */
export interface JSDiagnostics {
  runtime: Diagnostic[]
  syntax: Diagnostic[]
}
