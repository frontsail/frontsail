import { Element } from 'parse5/dist/tree-adapters/default'
import { CodePart, Diagnostic } from './code'

/**
 * Describes an attribute value from an element node in a parse5 AST.
 */
export interface AttributeValue extends CodePart {
  /**
   * Element node to which this attribute belongs.
   */
  element: Element
}

/**
 * Describes a collection of diagnostics for an HTML AST organized by types
 * (object keys).
 */
export interface HTMLDiagnostics {
  alpineDirectives: Diagnostic[]
  attributeNames: Diagnostic[]
  ifAttributes: Diagnostic[]
  includeElements: Diagnostic[]
  injectElements: Diagnostic[]
  inlineCSS: Diagnostic[]
  mustacheLocations: Diagnostic[]
  mustacheValues: Diagnostic[]
  outletElements: Diagnostic[]
  syntax: Diagnostic[]
  tagAttributes: Diagnostic[]
}

/**
 * Describes a `{{ mustache_tag }}` with its range in the code.
 */
export interface MustacheTag extends CodePart {
  /**
   * The text between the curly braces.
   */
  variable: string
}
