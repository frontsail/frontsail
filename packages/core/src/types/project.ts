import { Component } from '../Component'
import { Page } from '../Page'

export interface ProjectOptions {
  /**
   * **Development** mode specifics:
   *
   * - Template keys are generated from the template name/path (e.g. 'ui/text-input'
   *   resolves to 'ui__text_input', and '/foo/bar-baz' to '__foo__bar_baz').
   *
   * - Alpine data and directives remain in the HTML as attributes.
   *
   * - Build outputs are pretty.
   *
   * ---
   *
   * **Production** mode specifics:
   *
   * - Template keys are generated like `/^_[cp][0-9]+_D$/` where `c` stands for
   *   component and `p` for page. The number after that is a unique index for the
   *   template. The underscores (`_`) and `D` are parts of the FrontSail logo.
   *   Key examples: '_c1_D', '_p1_D', etc.
   *
   * - Alpine data and directives are extracted from all elements and inserted into
   *   the project's scripts file. Only the `x-data` (with the template key) and
   *   `x-bind` attributes remains in the HTML.
   *
   * - Build outputs are minified.
   */
  environment?: 'development' | 'production'

  /**
   * Collection of registered global variables that can be used across all templates.
   * The object keys must match the pattern `/^[A-Z]+(?:_[A-Z0-9]+)*$/` (e.g. 'TITLE',
   * 'HOME_URL', etc.).
   */
  globals?: { [name: string]: string }

  /**
   * Collection of registered SCSS variables that can be used custom and inline CSS
   * code. The object keys must match the pattern `/^\$[a-z][a-zA-Z0-9]*$/` (e.g.
   * '$primary', '$containerWidth', etc.).
   */
  scssVariables?: { [name: string]: string }

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
   * JavaScript code appended after the auto-generated Alpine data registrations in
   * the project scripts.
   */
  js?: string

  /**
   * Project styles with SCSS-like syntax that can be used to a limited extend. The
   * `@inlineCSS` directive can be used only once in the code. This directive is
   * replaced with the extracted `css` attribute values from all registered templates
   * during the build process.
   */
  css?: string
}
