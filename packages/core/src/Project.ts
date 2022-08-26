import { clearObject, compareArrays, diffArrays, uniqueArray } from '@frontsail/utils'
import { minify } from 'terser'
import { Component } from './Component'
import { CSS } from './CSS'
import { Page } from './Page'
import { ProjectDiagnostics } from './ProjectDiagnostics'
import { Template } from './Template'
import { Diagnostic } from './types/code'
import { AtLeastOne } from './types/generic'
import { ProjectOptions, RenderResults } from './types/project'
import { TemplateDiagnostics } from './types/template'
import { isGlobalName, isPagePath } from './validation'

/**
 * Manages project variables, components, pages, assets, scripts, and styles.
 *
 * ---
 *
 * Glossary:
 *
 * - **Alpine** - A lightweight JavaScript framework ([link](https://alpinejs.dev/)).
 *
 * - **Asset** - A file located in the `assets` directory.
 *
 * - **Attribute** - An HTML attribute (e.g. `<div attribute-name="value"></div>`).
 *
 * - **Base class** - Class name of an inline CSS rule that is automatically generated
 *   from template keys.
 *
 * - **Directive** - Refers to an Alpine [directive](https://alpinejs.dev/start-here).
 *
 * - **Element** - An HTML element (e.g. `<div></div>`).
 *
 * - **Global** - Refers to a globally accessible string variable that can be
 *   interpolated across templates and used in CSS in declaration values and media
 *   queries. Global names starts with a dollar sign (`$`) followed by a safe camel
 *   string (e.g. '$copyright', '$primaryColor', etc.).
 *
 * - **Include** - Refers to using the special `<include>` tag to render components.
 *
 * - **Inject** - Refers to a special `<inject>` element for inserting its child nodes
 *   into a component outlet. These elements must be directly nested within `<include>`
 *   elements. Inject tags can have an `into` attribute whose value must match an
 *   existing outlet name. If omitted, the 'main' outlet is targeted by default.
 *
 * - **Inline CSS** - Refers to a CSS rule written in a custom `css` attribute,
 *   without a selector, which can have SCSS-like syntax. It should not be confused
 *   with inline styles.
 *
 * - **Interpolation** - Refers to embedding expressions using the "Mustache" syntax
 *   (double curly braces). Only globals (e.g. `{{ HOME_URL }}`) and properties
 *   (e.g. `{{ icon_size }}`) can be interpolated. Interpolation cannot be used in
 *   attribute names and special attributes, like `css` and Alpine directives.
 *
 * - **Outlet** - Refers to a special component-only `<outlet>` element that is replaced
 *   during the render phase by child nodes of `<inject>` elements used in parent
 *   templates. Outlets can only have one `name` attribute, which must be unique within
 *   the component. If omitted, the output is named 'main' by default. Outlet elements
 *   can contain child nodes that are rendered if the parent template does not specify
 *   an associated `<inject>` tag.
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
 * - **Property** - Refers to a scoped string variable that can only be accessed and
 *   interpolated within a specific template. Property names are always written in
 *   lower snake case (e.g. 'size', 'shadow_opacity', etc.).
 *
 * - **Selector** - Refers to a CSS selector.
 *
 * - **Safe camel** - A camel case string that matches the pattern `/^[a-z][a-zA-Z0-9]*$/`.
 *   Note that this particular slug must start with a letter.
 *
 * - **Safe slug** - A string that matches the pattern `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/`.
 *   Note that this particular slug must start with a letter.
 *
 * - **Template** - Refers to a component or page.
 *
 * - **Template ID** - Refers to a component name (e.g. 'ui/text-input') or a page
 *   path (e.g. '/contact'). The IDs must contain slugs that can be separated by
 *   forward slashes (`/`). Component IDs always start with a safe slug and page
 *   IDs with a forward slash.
 *
 * - **Template key** - A unique string identifier that is used in the base class
 *   name for CSS rules generated from `css` attributes and in the default Alpine
 *   component name in `x-data` directives.
 */
export class Project extends ProjectDiagnostics {
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
   * - Build outputs are minified.
   */
  protected _environment: 'development' | 'production' = 'production'

  /**
   * Collection of registered global variables that can be used across all templates
   * and CSS. The object keys must match the pattern `/^\$[a-z][a-zA-Z0-9]*$/` (e.g.
   * '$baseTitle', '$primaryColor', '$containerWidth', etc.).
   */
  protected _globals: { [name: string]: string } = {}

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
   * List of registered asset paths in the project. The paths must start with '/assets/'.
   * Examples: '/assets/share.png', '/assets/images/logo.svg', etc.
   */
  protected _assets: string[] = []

  /**
   * Custom CSS code prepended before other inline CSS styles in the project styles.
   */
  protected _css: string = ''

  /**
   * Cache for the latest custom CSS build.
   */
  protected _cssCache: { key: string; css: string } = { key: '', css: '' }

  /**
   * Custom JavaScript code prepended before the auto-generated Alpine data in the
   * project scripts.
   */
  protected _js: string = ''

  /**
   * Collection of template IDs used for genering unique template keys.
   */
  protected _indices: { components: string[]; pages: string[] } = { components: [], pages: [] }

  /**
   * Instantiate the `Project` with predefined variables, components, pages, assets,
   * scripts, or styles.
   *
   * @param options Initialization options.
   * @throws an error if `options` are malformed.
   */
  constructor(options: ProjectOptions = {}) {
    super()

    Object.keys(options).forEach((key: keyof ProjectOptions) => {
      switch (key) {
        case 'environment':
          this.setEnvironment(options[key]!)
          break
        case 'globals':
          this.setGlobals(options[key]!)
          break
        case 'components':
          options[key]!.forEach((component) => this.addComponent(component.name, component.html))
          break
        case 'pages':
          options[key]!.forEach((page) => this.addPage(page.path, page.html))
          break
        case 'assets':
          options[key]!.forEach((asset) => this.addAsset(asset))
          break
        case 'js':
          this.setCustomJS(options[key]!)
          break
        case 'css':
          this.setCustomCSS(options[key]!)
          break
        default:
          throw new Error(`Unknown option '${key}'.`)
      }
    })
  }

  /**
   * Register a new asset to the project. The asset `path` must match the pattern
   * `/^\/assets\/[a-zA-Z0-9 \(\),\._-]+(?:\/[a-zA-Z0-9 \(\),\._-]+)*$/`.
   *
   * @throws an error if the asset path already exists.
   */
  addAsset(path: string): this {
    if (this.hasAsset(path)) {
      throw new Error(`An asset with the path '${path}' already exists.`)
    }

    this._assets.push(path)

    return this
  }

  /**
   * Register a new component to the project. The component `name` must match the
   * pattern `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/`.
   *
   * @throws an error if the component name is taken.
   */
  addComponent(name: string, html: string): this {
    if (this.hasComponent(name)) {
      throw new Error(`A component named '${name}' already exists.`)
    }

    this._components[name] = new Component(name, html, this)

    if (!this._indices.components.includes(name)) {
      this._indices.components.push(name)
    }

    return this
  }

  /**
   * Register a new page to the project. The page `path` must match the pattern
   * `/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/`.
   *
   * @throws an error if the page path is taken.
   */
  addPage(path: string, html: string): this {
    if (this.hasPage(path)) {
      throw new Error(`A page with the path '${path}' already exists.`)
    }

    this._pages[path] = new Page(path, html, this)

    if (!this._indices.pages.includes(path)) {
      this._indices.pages.push(path)
    }

    return this
  }

  /**
   * Build the project scripts from the custom JS code and the auto-generated Alpine
   * data registrations.
   */
  async buildScripts(): Promise<string> {
    const alpine: string[] = []

    this.listComponents().forEach((name) => {
      const alpineData = this.getComponent(name).resolveAlpineData()

      if (alpineData) {
        alpine.push(alpineData)
      }
    })

    if (alpine.length) {
      alpine.unshift('', "document.addEventListener('alpine:init', () => {")
      alpine.push('})')
    }

    let js = (this._js + alpine.join('\n')).trim()

    if (this.isProduction()) {
      try {
        js = (await minify(js)).code ?? js
      } catch (_) {}
    }

    return js
  }

  /**
   * Build the project styles from the custom CSS code and the auto-generated inline
   * CSS styles.
   */
  buildStyles(): string {
    const globals = this.listGlobals()

    if (this._cssCache.key !== globals + this._css) {
      this._cssCache.key = globals + this._css
      this._cssCache.css = new CSS(this._css).build(globals)
    }

    const output: string[] = [this._cssCache.css]

    this.listComponents().forEach((name) => {
      const key = this.isProduction() ? `c${this.getComponentIndex(name)}` : `${name}__`
      output.push(this.getComponent(name).buildInlineCSS(key, globals))
    })

    this.listPages().forEach((path) => {
      const key = this.isProduction() ? `c${this.getPageIndex(path)}` : `${path}__`
      output.push(this.getComponent(path).buildInlineCSS(key, globals))
    })

    let css = output.join('\n').replace(/\$[a-z][a-zA-Z0-9]*/g, (match) => {
      return this._globals[match] ?? match
    })

    if (this.isProduction()) {
      css = new CSS(css).build(globals, true)
    }

    return css.trim()
  }

  /**
   * Check if there are any diagnostics of specific `types` in a component named
   * `name`. Use a wildcard (`*`) to check all types.
   *
   * @throws an error if the component does not exist.
   */
  componentHasProblems(name: string, ...types: AtLeastOne<TemplateDiagnostics>): boolean {
    return this.getComponent(name).hasProblems(...types)
  }

  /**
   * Verify the existence of an asset by its `path`.
   *
   * @throws an error if the asset does not exist.
   */
  protected _ensureAsset(path: string): this {
    if (!this.hasAsset(path)) {
      throw new Error(`Asset '${path}' does not exist.`)
    }

    return this
  }

  /**
   * Verify the existence of a component by its `name`.
   *
   * @throws an error if the component does not exist.
   */
  protected _ensureComponent(name: string): this {
    if (!this.hasComponent(name)) {
      throw new Error(`Component '${name}' does not exist.`)
    }

    return this
  }

  /**
   * Verify the existence of a page by its `path`.
   *
   * @throws an error if the page does not exist.
   */
  protected _ensurePage(path: string): this {
    if (!this.hasPage(path)) {
      throw new Error(`Page '${path}' does not exist.`)
    }

    return this
  }

  /**
   * Get a component by its `name`.
   *
   * @throws an error if the component does not exist.
   */
  getComponent(name: string): Component {
    return this._ensureComponent(name)._components[name]
  }

  /**
   * Get diagnostics of specific `types` in a component named `name`. Use a wildcard
   * (`*`) to get diagnostics of all types.
   *
   * @throws an error if the page does not exist.
   */
  getComponentDiagnostics(name: string, ...types: AtLeastOne<TemplateDiagnostics>): Diagnostic[] {
    return this.getComponent(name).getDiagnostics(...types)
  }

  /**
   * Get the index (incremented by 1) of a component named `name`.
   *
   * @throws an error if the component does not exist.
   */
  getComponentIndex(name: string): number {
    return this._ensureComponent(name)._indices.components.indexOf(name) + 1
  }

  /**
   * Get the project's global variables.
   */
  getGlobals(): { [name: string]: string } {
    return { ...this._globals }
  }

  /**
   * Get a list of all included components in a template identified by `templateId`.
   *
   * @param templateId Component name or page path.
   * @param recursive Whether to aggregate results from deeply included components.
   * @throws an error if the template with the specified `templateId` does not exist.
   */
  getIncludedComponentNames(templateId: string, recursive: boolean = false): string[] {
    const components = this._getTemplate(templateId).getIncludedComponentNames()

    if (recursive) {
      const checked = this.hasComponent(templateId) ? [templateId] : []

      while (!compareArrays(components, checked)) {
        for (const name of diffArrays(components, checked)) {
          if (this.hasComponent(name)) {
            components.push(...this.getComponent(name).getIncludedComponentNames())
          }

          checked.push(name)
        }
      }
    }

    return uniqueArray(components).sort()
  }

  /**
   * Get outlet names from a component named `componentName`.
   *
   * @throws an error if the component does not exist.
   */
  getOutletNames(componentName: string): string[] {
    return this.getComponent(componentName).getOutletNames()
  }

  /**
   * Get a page by its `path`.
   *
   * @throws an error if the page does not exist.
   */
  getPage(path: string): Page {
    return this._ensurePage(path)._pages[path]
  }

  /**
   * Get diagnostics of specific `types` from a page with the path `path`. Use a
   * wildcard (`*`) to get diagnostics of all types.
   *
   * @throws an error if the page does not exist.
   */
  getPageDiagnostics(path: string, ...types: AtLeastOne<TemplateDiagnostics>): Diagnostic[] {
    return this.getPage(path).getDiagnostics(...types)
  }

  /**
   * Get the index (incremented by 1) of a page with the path `path`.
   *
   * @throws an error if the page does not exist.
   */
  getPageIndex(path: string): number {
    return this._ensurePage(path)._indices.pages.indexOf(path) + 1
  }

  /**
   * Get a list of property names from a template identified by `templateId`.
   */
  getPropertyNames(templateId: string): string[] {
    return this._getTemplate(templateId).getPropertyNames()
  }

  /**
   * Get a template by its `id` (component name or page path).
   *
   * @throws an error if the template does not exist.
   */
  protected _getTemplate(id: string): Template {
    if (this.hasComponent(id)) {
      return this.getComponent(id)
    } else if (this.hasPage(id)) {
      return this.getPage(id)
    } else {
      throw new Error(`The template '${id}' does not exist.`)
    }
  }

  /**
   * Check if there is an asset with the path `path` in the project.
   */
  hasAsset(path: string): boolean {
    return this._assets.includes(path)
  }

  /**
   * Check if there is a component named `name` in the project.
   */
  hasComponent(name: string): boolean {
    return this._components.hasOwnProperty(name)
  }

  /**
   * Check if there is a global variable named `name` in the project.
   */
  hasGlobal(name: string): boolean {
    return this._globals.hasOwnProperty(name)
  }

  /**
   * Check if there is a page with the path `path` in the project.
   */
  hasPage(path: string): boolean {
    return this._pages.hasOwnProperty(path)
  }

  /**
   * Check if a template (component or page) includes a component.
   *
   * @param templateId ID of the template to search in.
   * @param componentName Component name to search for.
   * @param recursive Whether to aggregate results from deeply included components.
   * @throws an error if the template with the specified `templateId` does not exist.
   */
  includesComponent(
    templateId: string,
    componentName: string,
    recursive: boolean = false,
  ): boolean {
    return recursive
      ? this.getIncludedComponentNames(templateId).includes(componentName)
      : this._getTemplate(templateId).includesComponent(componentName)
  }

  /**
   * Check if the current environment is set to 'development'.
   */
  isDevelopment(): boolean {
    return this._environment === 'development'
  }

  /**
   * Check if the current environment is set to 'production'.
   */
  isProduction(): boolean {
    return this._environment === 'production'
  }

  /**
   * Get a sorder list of all registered asset paths in the project.
   */
  listAssets(): string[] {
    return [...this._assets].sort()
  }

  /**
   * Get a sorder list of all registered component names in the project.
   */
  listComponents(): string[] {
    return Object.keys(this._components).sort()
  }

  /**
   * Get a list of all global variable names in their original order.
   */
  listGlobals(): string[] {
    return Object.keys(this._globals)
  }

  /**
   * Get a sorder list of all registered page paths in the project.
   */
  listPages(): string[] {
    return Object.keys(this._pages).sort()
  }

  /**
   * Analyze a component named `name` by running specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getComponentDiagnostics()`.
   *
   * @throws an error if the component does not exist.
   */
  lintComponent(name: string, ...tests: AtLeastOne<TemplateDiagnostics>): this {
    this.getComponent(name).lint(...tests)
    return this
  }

  /**
   * Analyze a page with the path `path` by running specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getPageDiagnostics()`.
   *
   * @throws an error if the component does not exist.
   */
  lintPage(path: string, ...tests: AtLeastOne<TemplateDiagnostics>): this {
    this.getPage(path).lint(...tests)
    return this
  }

  /**
   * Check if there are any diagnostics of specific `types` in a page with the path
   * `path`. Use a wildcard (`*`) to check all types.
   *
   * @throws an error if the page does not exist.
   */
  pageHasProblems(path: string, ...types: AtLeastOne<TemplateDiagnostics>): boolean {
    return this.getPage(path).hasProblems(...types)
  }

  /**
   * Deregister an asset with the path `path` from the project.
   *
   * @throws an error if the asset does not exist.
   */
  removeAsset(path: string): this {
    delete this._ensureAsset(path)._assets[path]
    return this
  }

  /**
   * Deregister a component named `name` from the project.
   *
   * @throws an error if the component does not exist.
   */
  removeComponent(name: string): this {
    delete this._ensureComponent(name)._components[name]
    return this
  }

  /**
   * Deregister a page with the path `path` from the project.
   *
   * @throws an error if the page does not exist.
   */
  removePage(path: string): this {
    delete this._ensurePage(path)._pages[path]
    return this
  }

  /**
   * Render a template identified by `templateId` with specified `properties`.
   *
   * @returns the rendered HTML and diagnostics.
   * @throws an error if the template with the specified `templateId` does not exist.
   */
  render(templateId: string, properties: { [name: string]: string } = {}): RenderResults {
    const dependencies = this.getIncludedComponentNames(templateId, true)
    const results: RenderResults = { html: '', diagnostics: [] }

    if (isPagePath(templateId)) {
      results.diagnostics.push(
        ...this.lintPage(templateId, '*').getPageDiagnostics(templateId, '*'),
      )
    } else {
      results.diagnostics.push(
        ...this.lintComponent(templateId, '*').getComponentDiagnostics(templateId, '*'),
      )
    }

    dependencies.forEach((dependency) => {
      results.diagnostics.push(
        ...this.lintComponent(dependency, '*').getComponentDiagnostics(dependency, '*'),
      )
    })

    if (results.diagnostics.length === 0) {
      const templateResults = this._getTemplate(templateId).render(properties)
      results.html = templateResults.html.toString(this.isProduction())
      results.diagnostics.push(...templateResults.diagnostics)
    }

    return results
  }

  /**
   * Set the custom CSS code.
   */
  setCustomCSS(code: string): this {
    this._css = code
    return this
  }

  /**
   * Set the custom JavaScript code.
   */
  setCustomJS(code: string): this {
    this._js = code
    return this
  }

  /**
   * Set the project environment `mode`.
   *
   * @throws an error if the `mode` is invalid.
   */
  setEnvironment(mode: 'development' | 'production'): this {
    if (mode === 'development' || mode === 'production') {
      this._environment = mode
    } else {
      throw new Error(`Invalid environment mode '${mode}'.`)
    }

    return this
  }

  /**
   * Set the project's global variables from a collection of `globals`.
   *
   * @throws an error if a global name is not valid.
   */
  setGlobals(globals: { [name: string]: string }): this {
    for (const name in globals) {
      if (!isGlobalName(name)) {
        throw new Error(`Invalid global name '${name}'.`)
      }
    }

    clearObject(this._globals)

    for (const name in globals) {
      this._globals[name] = globals[name]
    }

    return this
  }

  /**
   * Reinstantiate an existing component named `name` with new `html` content.
   *
   * @throws an error if a previous component with the `name` does not exist.
   */
  updateComponent(name: string, html: string): this {
    return this.removeComponent(name).addComponent(name, html)
  }

  /**
   * Reinstantiate an existing page with the path `path` with new `html` content.
   *
   * @throws an error if a previous page with the `path` does not exist.
   */
  updatePage(path: string, html: string): this {
    return this.removePage(path).addPage(path, html)
  }
}
