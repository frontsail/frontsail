import { Diagnostic } from './code'
import { HTMLDiagnostics } from './html'

/**
 * Describes a collection of component names and asset paths.
 */
export interface Dependencies {
  components: string[]
  assets: string[]
}

/**
 * Describes a collection of diagnostics for a template organized by types
 * (object keys).
 */
export interface TemplateDiagnostics extends HTMLDiagnostics {
  dependencies: Diagnostic[]
}
