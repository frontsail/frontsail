import { clearArray, uniqueArray } from '@frontsail/utils'
import { Diagnostics } from './Diagnostics'
import { HTML } from './HTML'
import { JS } from './JS'
import { Project } from './Project'
import { RenderDiagnostic } from './types/code'
import { AtLeastOne } from './types/generic'
import { TemplateDiagnostics, TemplateRenderResults } from './types/template'
import { isComponentName, isPropertyName } from './validation'

/**
 * Handles common features of components and pages, such as abstract syntax trees,
 * dependencies, and linting.
 *
 * ---
 *
 * Glossary:
 *
 * - **AST** - Refers to an HTML abstract sytax tree.
 *
 * - **Dependency** - A component included in the template.
 *
 * - **Include** - Refers to using the special `<include>` tag to render components.
 *
 * - **Inject** - Refers to a special `<inject>` element for inserting its child nodes
 *   into a component outlet. These elements must be directly nested within `<include>`
 *   elements. Inject tags can have an `into` attribute whose value must match an
 *   existing outlet name. If omitted, the 'main' outlet is targeted by default.
 *
 * - **Outlet** - Refers to a special component-only `<outlet>` element that is replaced
 *   during the render phase by child nodes of `<inject>` elements used in parent
 *   templates. Outlets can only have one `name` attribute, which must be unique within
 *   the component. If omitted, the output is named 'main' by default. Outlet elements
 *   can contain child nodes that are rendered if the parent template does not specify
 *   an associated `<inject>` tag.
 *
 * - **Safe slug** - A string that matches the pattern `/^[a-z]+(?:-[a-z0-9]+)*$/`.
 *   Note that this particular slug must start with a letter.
 */
export class Template extends Diagnostics<TemplateDiagnostics> {
  /**
   * A component name (e.g. 'ui/text-input') or a page path (e.g. '/contact').
   * The IDs must contain slugs that can be separated by forward slashes (`/`).
   * Component IDs always start with a safe slug and page IDs with a forward slash.
   */
  protected _id: string

  /**
   * Template type.
   */
  protected _type: 'component' | 'page'

  /**
   * An HTML class object instantiated from the template content.
   *
   * @see HTML for more details.
   */
  protected _html: HTML

  /**
   * The `Project` instance to which the template belongs.
   */
  protected _project?: Project

  /**
   * List of component names directly included in this template.
   */
  protected _dependencies: string[] = []

  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: TemplateDiagnostics = {
    alpineDirectives: [],
    attributeNames: [],
    dependencies: [],
    ifAttributes: [],
    includeElements: [],
    injectElements: [],
    mustacheLocations: [],
    mustacheValues: [],
    outletElements: [],
    syntax: [],
    templateSpecific: [],
  }

  /**
   * Instantiate with an abstract syntax tree and resolve its direct dependencies.
   *
   * @param id A unique template identifier.
   * @param html The HTML code to parse.
   * @param project A `Project` instance used for linting dependencies.
   */
  constructor(id: string, html: string, project?: Project) {
    super()

    this._id = id
    this._html = new HTML(html)
    this._project = project
    this._resolveDependencies()
  }

  /**
   * Get a list of all included components in the template. This method does not
   * recursively get the dependencies of the included components. For depth checks,
   * use the method `getIncludedComponentNames` in the `Project` class.
   */
  getIncludedComponentNames(): string[] {
    return [...this._dependencies]
  }

  /**
   * Get all extracted property names found in the HTML.
   */
  getPropertyNames(): string[] {
    return this._html.getPropertyNames()
  }

  /**
   * Check if the template includes a specific component. This method does not
   * recursively check dependencies of the included components. For depth checks,
   * use the method `includesComponent` in the `Project` class.
   */
  includesComponent(name: string): boolean {
    return this._dependencies.includes(name)
  }

  /**
   * Analyze all nodes in the AST and run the specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getDiagnostics()`.
   */
  lint(...tests: AtLeastOne<TemplateDiagnostics>): this {
    if (!this.hasProblems('syntax')) {
      this.clearDiagnostics(...tests)
      this.testAndMergeDiagnostics(this._html, ...tests)

      if (this.shouldTest('dependencies', tests)) {
        for (const node of this._html.walk()) {
          if (HTML.adapter.isElementNode(node)) {
            //
            // Check dependencies
            //
            if (node.tagName === 'include' && this.shouldTest('dependencies', tests)) {
              const component: { name: string | null; properties: string[] } = {
                name: null,
                properties: [],
              }

              for (const attr of node.attrs) {
                if (attr.name === 'component') {
                  if (this._project?.hasComponent(attr.value)) {
                    component.name = attr.value
                    component.properties.push(...this._project.getPropertyNames(attr.value))
                  } else {
                    this.addDiagnostics('dependencies', {
                      message: 'Component does not exist.',
                      severity: 'warning',
                      ...this._html.getAttributeValueRange(node, attr.name)!,
                    })
                  }
                }
              }

              if (component.name) {
                for (const attr of node.attrs) {
                  if (
                    !['if', 'component'].includes(attr.name) &&
                    isPropertyName(attr.name) &&
                    !component.properties.includes(attr.name)
                  ) {
                    this.addDiagnostics('dependencies', {
                      message: `Property '${attr.name}' does not exist in component '${component.name}'.`,
                      severity: 'warning',
                      ...this._html.getAttributeNameRange(node, attr.name)!,
                    })
                  }
                }

                const hasAnonymousInjection =
                  node.childNodes.length > 0 &&
                  node.childNodes.every((childNode) => {
                    return (
                      (HTML.adapter.isElementNode(childNode) && childNode.tagName !== 'inject') ||
                      (HTML.adapter.isTextNode(childNode) && childNode.value.trim())
                    )
                  })
                const outletNames = this._project!.getOutletNames(component.name)

                if (hasAnonymousInjection && !outletNames.includes('main')) {
                  this.addDiagnostics('dependencies', {
                    message:
                      outletNames.length > 0
                        ? `Outlet 'main' does not exist in component '${component.name}'.`
                        : `Component '${component.name}' has no outlets.`,
                    severity: 'warning',
                    from: node.sourceCodeLocation!.startTag!.endOffset,
                    to:
                      node.sourceCodeLocation!.endTag?.startOffset ??
                      node.sourceCodeLocation!.endOffset,
                  })
                }
              }
            } else if (node.tagName === 'inject' && this.shouldTest('dependencies', tests)) {
              const parent = HTML.adapter.getParentNode(node)

              if (
                parent &&
                HTML.adapter.isElementNode(parent) &&
                parent.tagName === 'include' &&
                parent.attrs.some((attr) => attr.name === 'component')
              ) {
                const intoValue = HTML.getInjectIntoValue(node)
                const componentName = parent.attrs.find((attr) => attr.name === 'component')!.value

                if (intoValue && this._project?.hasComponent(componentName)) {
                  const outletNames = this._project.getOutletNames(componentName)

                  if (outletNames.length > 0) {
                    if (!outletNames.includes(intoValue)) {
                      this.addDiagnostics('dependencies', {
                        message: `Outlet '${intoValue}' does not exist in component '${componentName}'.`,
                        severity: 'warning',
                        ...this._html.getAttributeValueRange(node, 'into')!,
                      })
                    }
                  } else {
                    this.addDiagnostics('dependencies', {
                      message: `Component '${componentName}' has no outlets.`,
                      severity: 'warning',
                      from: node.sourceCodeLocation!.startOffset,
                      to: node.sourceCodeLocation!.endOffset,
                    })
                  }
                }
              }
            }
          }
        }
      }
    }

    return this
  }

  /**
   * Render the template with specified `properties`.
   *
   * @returns the rendered HTML instance and diagnostics.
   * @throws an error if a project is not defined.
   */
  render(
    properties: { [name: string]: string },
    _iterations: string[] = [],
  ): TemplateRenderResults {
    if (!this._project) {
      throw new Error('Cannot render templates without a project.')
    }

    const variables = { ...properties, ...this._project.getGlobals() }
    const html: HTML =
      _iterations.length === 0 && this._type === 'component'
        ? (this as any).resolveAlpineDirectives().replaceMustaches(variables)
        : this._html.replaceMustaches(variables)
    const diagnostics: RenderDiagnostic[] = []

    for (const node of html.walk()) {
      if (HTML.adapter.isElementNode(node)) {
        const ifAttribute = node.attrs.find((attr) => attr.name === 'if')

        // Remove when if expression evaluates to a falsy value
        if (ifAttribute && node.tagName !== 'outlet') {
          if (!new JS(ifAttribute.value).evaluate(variables)) {
            HTML.adapter.detachNode(node)
            continue
          }
        }

        // Remove `css` attributes
        node.attrs = node.attrs.filter((attr) => attr.name !== 'css')

        if (node.tagName === 'include') {
          const componentName = node.attrs.find((attr) => attr.name === 'component')!.value
          const componentClone = this._project.getComponent(componentName).clone()
          const includeProperties = HTML.getIncludeProperties(node)
          const injections = HTML.getInjections(node)

          // Detach child nodes (they are rendered in outlets)
          node.childNodes.forEach((childNode) => HTML.adapter.detachNode(childNode))

          // Don't resolve Alpine directives for injected contents
          componentClone._html = componentClone.resolveAlpineDirectives().inject(injections)

          const iteration =
            componentName + JSON.stringify(includeProperties) + componentClone._html.getRawHTML()

          // Detect infinite loops
          if (_iterations.includes(iteration)) {
            HTML.adapter.detachNode(node)

            diagnostics.push({
              templateId: this._id,
              message: `The included component '${componentName}' caused an infinite loop.`,
              severity: 'error',
              from: node.sourceCodeLocation!.startOffset,
              to: node.sourceCodeLocation!.endOffset,
            })

            continue
          }

          _iterations.push(iteration)

          const results = componentClone.render(includeProperties, [..._iterations])
          const rootNode = results.html.getRootNodes()[0]

          HTML.replaceElement(node, rootNode)

          diagnostics.push(
            ...results.diagnostics.map((diagnostic) => ({
              templateId: this._id,
              ...diagnostic,
            })),
          )
        } else if (node.tagName === 'inject') {
          HTML.adapter.detachNode(node)
        } else if (node.tagName === 'outlet') {
          HTML.replaceElement(node, ...node.childNodes)
        }
      }
    }

    return { html: new HTML(html.toString()), diagnostics }
  }

  /**
   * Extract included component names from the HTML AST.
   */
  protected _resolveDependencies(): void {
    const names: string[] = []

    this._html.getElements('include').forEach((element) => {
      for (const attr of element.attrs) {
        if (attr.name === 'component' && isComponentName(attr.value)) {
          names.push(attr.value)
        }
      }
    })

    clearArray(this._dependencies).push(...uniqueArray(names).sort())
  }
}
