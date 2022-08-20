import { ChildNode } from 'parse5/dist/tree-adapters/default'
import { HTML } from '../HTML'
import { Diagnostic } from './code'
import { HTMLDiagnostics } from './html'

/**
 * Describes child nodes of an `<inject>` element.
 */
export type Injections = { [outletName: string]: ChildNode[] }

/**
 * Describes a collection of diagnostics for a template organized by types
 * (object keys).
 */
export interface TemplateDiagnostics extends HTMLDiagnostics {
  dependencies: Diagnostic[]
  templateSpecific: Diagnostic[]
}

/**
 * Describes results of a render process called from a `Template`.
 */
export interface TemplateRenderResults {
  html: HTML
  diagnostics: Diagnostic[]
}
