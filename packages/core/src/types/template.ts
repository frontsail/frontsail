import { Diagnostic } from './code'
import { HTMLDiagnostics } from './html'

/**
 * Describes a collection of diagnostics for a template organized by types
 * (object keys).
 */
export interface TemplateDiagnostics extends HTMLDiagnostics {
  dependencies: Diagnostic[]
  templateSpecific: Diagnostic[]
}
