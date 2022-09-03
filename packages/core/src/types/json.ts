import { Diagnostic } from './code'

/**
 * Describes a collection of diagnostics for a JSON AST organized by types (object keys).
 */
export interface JSONDiagnostics {
  syntax: Diagnostic[]
}
