import { Component } from './Component'
import { Page } from './Page'
import { ProjectOptions } from './types/ProjectOptions'

/**
 * Manages project variables, components, pages, assets, scripts, and styles.
 *
 * ---
 *
 * Glossary:
 *
 * - **Alpine** - A lightweight JavaScript framework ([link](https://alpinejs.dev/)).
 *
 * - **Attribute** - An HTML attribute (e.g. `<div attribute-name="value"></div>`).
 *
 * - **Base class** - Class name of an inline CSS rule that is automatically generated
 *   from template keys by default. Alternatively, it can be specified in a `css`
 *   attribute name by using dot notation (e.g. `css.my-class`).
 *
 * - **Directive** - Refers to an Alpine [directive](https://alpinejs.dev/start-here)
 *   or the custom CSS at-rule `@inlineCSS` (depending on the context).
 *
 * - **Element** - An HTML element (e.g. `<div></div>`).
 *
 * - **Global** - Refers to a globally accessible string variable that can be
 *   interpolated across templates. Global variables are always written in upper
 *   snake case and must begin with a letter (e.g. 'YEAR', 'COPYRIGHT_TEXT', etc.).
 *
 * - **Inline CSS** - Refers to a CSS rule written in a custom `css` attribute,
 *   without a selector, which can have nested SCSS-like ampersand-rules and at-rules.
 *   It should not be confused with inline styles.
 *
 * - **Interpolation** - Refers to embedding expressions using the "Mustache" syntax
 *   (double curly braces). Only globals (e.g. `{{ HOME_URL }}`) and properties
 *   (e.g. `{{ icon_size }}`) can be interpolated. Interpolation cannot be used in
 *   attribute names and special attributes, like `css` and Alpine directives.
 *
 * - **Parent selector** - A special selector (`&`) invented by Sass that's used in
 *   nested selectors to refer to the outer selector. It makes it possible to re-use
 *   the outer selector in more complex ways (e.g. `.dark &`).
 *
 * - **Project scripts** - A single JavaScript file containing custom scripts and
 *   Alpine data extracted from components.
 *
 * - **Project styles** - A single CSS file containing custom styles and inline CSS
 *   rules from all templates.
 *
 * - **Property** - Refers to a scoped variable that can only be accessed and
 *   interpolated within a specific template. They are always written in lower snake
 *   case and must begin with a letter (e.g. 'size', 'shadow_opacity', etc.).
 *
 * - **SCSS variable** - Refers to custom string variable that starts with a dollar
 *   sign (`$`) and can be used in custom and inline CSS code. The variable identifier
 *   is always written in camel case (e.g. `$primaryColor`). It should not be confused
 *   with standard CSS variables, like `var(--primary-color)`. FrontSail uses the SCSS
 *   syntax in a special and restrictive manner. Full SCSS support is not provided.
 *
 * - **Selector** - Refers to a CSS selector.
 *
 * - **Safe slug** - A string that matches the pattern `/^[a-z]+(?:-[a-z0-9]+)*$/`.
 *   Note that this particular slug must start with a letter.
 *
 * - **Template** - Refers to a component or page.
 *
 * - **Template ID** - Refers to a component name (e.g. 'ui/text-input') or a page
 *   path (e.g. '/contact'). The IDs must contain slugs that can be separated by
 *   forward slashes (`/`). Component IDs always start with a safe slug and page
 *   IDs with a forward slash.
 *
 * - **Template key** - A unique string identifier that is used as the base class
 *   name for CSS rules generated from `css` attributes. Additionally, the template
 *   key is used as the default Alpine component name in `x-data` directives.
 */
export class Project {
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
  protected _environment: 'development' | 'production' = 'production'

  /**
   * Collection of registered global variables that can be used across all templates.
   * The object keys must match the pattern `/^[A-Z]+(?:_[A-Z0-9]+)*$/` (e.g. 'TITLE',
   * 'HOME_URL', etc.).
   */
  protected _globals: { [name: string]: string } = {}

  /**
   * Collection of registered SCSS variables that can be used custom and inline CSS
   * code. The object keys must match the pattern `/^\$[a-z][a-zA-Z0-9]*$/` (e.g.
   * '$primary', '$containerWidth', etc.).
   */
  protected _scssVariables: { [name: string]: string } = {}

  /**
   * Collection of registered `Component` instances in the project. The object keys
   * must start with a safe slug (e.g. 'layout') and the rest of the string can
   * contain slugs (e.g. '123-teaser') separated by forward slashes (`/`).
   * Examples: 'hero', 'ui/button', 'layout/123-teaser', etc.
   *
   * @see Component for more details.
   */
  protected _components: { [name: string]: Component } = {}

  /**
   * Collection of registered `Page` instances in the project. The object keys must
   * start with a forward slash (`/`) and the rest of the string can contain slugs
   * (e.g. '/2022/5-reasons-why-i-am-sick-of-articles-like-this-in-2022) separated
   * by forward slashes. Examples: '/' (home page), '/contact', '/news/' etc.
   *
   * @see Page for more details.
   *
   * @petition Dear SEs, please stop showing spam articles with path names like
   * `/^[0-9]+.+ in 20[0-9]{2}$/` in your results. I know you can do this!
   */
  protected _pages: { [name: string]: Page } = {}

  /**
   * JavaScript code appended after the auto-generated Alpine data registrations in
   * the project scripts.
   */
  protected _js: string = ''

  /**
   * Project styles with SCSS-like syntax that can be used to a limited extend. The
   * `@inlineCSS` directive can be used only once in the code. This directive is
   * replaced with the extracted `css` attribute values from all registered templates
   * during the build process.
   */
  protected _css: string = ''

  /**
   * Instantiate the `Project` with predefined variables, components, pages, assets,
   * scripts, or styles.
   *
   * @throws an error if `options` are malformed.
   */
  constructor(options: ProjectOptions = {}) {
    Object.keys(options).forEach((key: keyof ProjectOptions) => {
      switch (key) {
        case 'environment':
          // @todo
          break
        case 'globals':
          // @todo
          break
        case 'scssVariables':
          // @todo
          break
        case 'components':
          options[key]?.forEach((args) => this.addComponent(args.name, args.html))
          break
        case 'pages':
          options[key]?.forEach((args) => this.addPage(args.path, args.html))
          break
        case 'js':
          // @todo
          break
        case 'css':
          // @todo
          break
        default:
          throw new Error(`Unknown option key '${key}'.`)
      }
    })
  }

  /**
   * Register a new component to the project. The component `name` must match the
   * pattern `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/`.
   *
   * @throws an error if the component name is taken.
   */
  addComponent(name: string, html: string): void {
    if (this.hasComponent(name)) {
      throw new Error(`A component named '${name}' already exists.`)
    }

    this._components[name] = new Component(name, html)
  }

  /**
   * Register a new page to the project. The page `path` must match the pattern
   * `/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/`.
   *
   * @throws an error if the page path is taken.
   */
  addPage(path: string, html: string): void {
    if (this.hasPage(path)) {
      throw new Error(`A page with the path '${path}' already exists.`)
    }

    this._pages[path] = new Page(path, html)
  }

  /**
   * Check if a component with a specified `name` exists in the project.
   *
   * @returns true the component exists in the project.
   */
  hasComponent(name: string): boolean {
    return !!this._components[name]
  }

  /**
   * Check if a page with a specified `path` exists in the project.
   *
   * @returns true the page exists in the project.
   */
  hasPage(path: string): boolean {
    return !!this._pages[path]
  }

  /**
   * @todo
   */
  init(): void {}

  /**
   * Deregister a component from the project by its `name`.
   *
   * @returns true the component has been removed.
   */
  removeComponent(name: string): boolean {
    if (this.hasComponent(name)) {
      delete this._components[name]
      return true
    }

    return false
  }

  /**
   * Deregister a page from the project by its `path`.
   *
   * @returns true the page has been removed.
   */
  removePage(path: string): boolean {
    if (this.hasPage(path)) {
      delete this._pages[path]
      return true
    }

    return false
  }

  /**
   * Reinstantiate an existing component with new `html` content.
   *
   * @throws an error if a previous component with the same `name` doesn't exist.
   */
  updateComponent(name: string, html: string): void {
    if (!this.hasComponent(name)) {
      throw new Error(`The component '${name}' does not exist.'`)
    }

    this.removeComponent(name)
    this.addComponent(name, html)
  }

  /**
   * Reinstantiate an existing page with new `html` content.
   *
   * @throws an error if a previous page with the same `path` doesn't exist.
   */
  updatePage(path: string, html: string): void {
    if (!this.hasPage(path)) {
      throw new Error(`The page '${path}' does not exist.'`)
    }

    this.removePage(path)
    this.addPage(path, html)
  }
}
