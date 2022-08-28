import { Component } from '../Component'
import { Page } from '../Page'
import { CodePart, Diagnostic } from './code'
import { CSSDiagnostics } from './css'
import { JSDiagnostics } from './js'

/**
 * Describes a collection of diagnostics for custom CSS code organized by types
 * (object keys).
 */
export interface CustomCSSDiagnostics extends CSSDiagnostics {}

/**
 * Describes a collection of diagnostics for custom JS code organized by types
 * (object keys).
 */
export interface CustomJSDiagnostics extends JSDiagnostics {}

/**
 * Describes a global variable with its range in the code.
 */
export interface GlobalVariable extends CodePart {
  /**
   * The global variable name.
   */
  variable: string
}

export interface ProjectOptions {
  /**
   * **Development** mode specifics:
   *
   * - Template keys are generated from template IDs (e.g. 'button', '/foo/bar, etc.).
   *
   * - Alpine data and directives remain in the HTML as attributes.
   *
   * - Build outputs are pretty.
   *
   * ---
   *
   * **Production** mode specifics:
   *
   * - Template keys are generated like `/^[cp][0-9]+$/` where `c` stands for
   *   component and `p` for page. The number after that is a unique index for the
   *   template (e.g. 'c1', 'c2', 'p1', etc.).
   *
   * - Alpine data and directives are extracted from all elements and inserted into
   *   the project's scripts file. Only the `x-data` (with the template key), `x-bind`,
   *   `x-for`, and `x-cloak` attributes remain in the HTML.
   *
   * - HTML and CSS outputs are minified.
   */
  environment?: 'development' | 'production'

  /**
   * Collection of registered global variables that can be used across all templates
   * and CSS. The object keys must match the pattern `/^\$[a-z][a-zA-Z0-9]*$/` (e.g.
   * '$baseTitle', '$primaryColor', '$containerWidth', etc.).
   */
  globals?: { [name: string]: string }

  /**
   * Collection of registered `Component` instances in the project. The object keys
   * must start with a safe slug (e.g. 'layout') and the rest of the string can
   * contain slugs (e.g. '123-teaser') separated by forward slashes (`/`).
   * Examples: 'hero', 'ui/button', 'layout/123-teaser', etc.
   *
   * @see Component for more details.
   */
  components?: { name: string; html: string }[]

  /**
   * Collection of registered `Page` instances in the project. The object keys must
   * start with a forward slash (`/`) and the rest of the string can contain slugs
   * (e.g. '/2022/0-reasons-i-should-check-projects-ts) separated by forward slashes
   * Examples: '/' (home page), '/contact', '/news/' etc.
   *
   * @see Page for more details.
   */
  pages?: { path: string; html: string }[]

  /**
   * List of asset paths (e.g. '/assets/share.png', '/assets/images/logo.svg', etc.).
   */
  assets?: string[]

  /**
   * Custom CSS code prepended before other inline CSS styles in the project styles.
   */
  css?: string

  /**
   * Custom JavaScript code prepended before the auto-generated Alpine data in the
   * project scripts.
   */
  js?: string
}

/**
 * Describes results of a render process called from a `Project`.
 */
export interface RenderResults {
  /**
   * The rendered HTML code.
   */
  html: string

  /**
   * List of diagnostics created during the render process.
   */
  diagnostics: Diagnostic[]
}
