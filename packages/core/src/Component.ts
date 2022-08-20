import { split, uniqueArray } from '@frontsail/utils'
import { HTML } from './HTML'
import { Project } from './Project'
import { Template } from './Template'
import { AtLeastOne } from './types/generic'
import { TemplateDiagnostics } from './types/template'
import { isComponentName } from './validation'

/**
 * Handles component specific features, such as outlets and linting.
 *
 * @see Template for everything else.
 *
 * ---
 *
 * Glossary:
 *
 * - **AST** - Refers to an HTML abstract sytax tree.
 *
 * - **Attribute** - An HTML attribute (e.g. `<div attribute-name="value"></div>`).
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
 * - **Template** - Refers to a component or page.
 */
export class Component extends Template {
  /**
   * Alphabetically sorted outlet names found in the HTML code.
   */
  protected _outletNames: string[] = []

  /**
   * Validate the component `name` and instantiate.
   *
   * @param name A unique component name.
   * @param html The HTML code to parse.
   * @param project A `Project` instance used for linting dependencies.
   * @throws an error if the component name is not valid.
   */
  constructor(name: string, html: string, project?: Project) {
    if (!isComponentName(name)) {
      throw new Error(`The component name '${name}' is not valid.`)
    }

    super(name, html, project)

    this._extractOutletNames()
  }

  /**
   * Find and store outlet names used in the HTML.
   *
   * @throws an error if the AST is not defined.
   */
  protected _extractOutletNames(): void {
    const outletNames = this._html.getElements('outlet').map(HTML.getOutletName).filter(Boolean)
    this._outletNames.push(...uniqueArray(outletNames).sort())
  }

  /**
   * Get a list of all outlet names found in the HTML code.
   *
   * @throws an error if the AST is not defined.
   */
  getOutletNames(): string[] {
    return [...this._outletNames]
  }

  /**
   * Analyze all nodes in the AST and run the specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getDiagnostics()`.
   */
  lint(...tests: AtLeastOne<TemplateDiagnostics>): this {
    super.lint(...tests)

    const rootNodes = this._html.getRootNodes()

    // Check template
    //
    if (this.shouldTest('templateSpecific', tests)) {
      for (let i = 1; i < rootNodes.length; i++) {
        this.addDiagnostics('templateSpecific', {
          message: 'Components can have only one root node.',
          severity: 'error',
          from: rootNodes[i].sourceCodeLocation!.startOffset,
          to: rootNodes[i].sourceCodeLocation!.endOffset,
        })
      }
    }

    if (this.shouldTest('alpineDirectives', tests) || this.shouldTest('outletElements', tests)) {
      for (const node of this._html.walk()) {
        if (HTML.adapter.isElementNode(node)) {
          //
          // Check Alpine directives
          //
          if (this.shouldTest('alpineDirectives', tests)) {
            for (const attr of node.attrs) {
              if (attr.name === 'x-data' && !rootNodes.includes(node)) {
                this.addDiagnostics('outletElements', {
                  message: "The 'x-data' directive can only be used in the root element.",
                  severity: 'error',
                  ...this._html.getAttributeNameRange(node, attr.name)!,
                })
              }
            }
          }
          //
          // Check outlet elements
          //
          if (node.tagName === 'outlet' && this.shouldTest('outletElements', tests)) {
            if (rootNodes.includes(node)) {
              this.addDiagnostics('outletElements', {
                message: 'Outlets cannot be used as root elements.',
                severity: 'error',
                from: node.sourceCodeLocation!.startOffset,
                to: node.sourceCodeLocation!.endOffset,
              })
            }

            for (const attr of node.attrs) {
              if (attr.name === 'allow') {
                const componentNames = split(attr.value)

                for (const componentName of componentNames) {
                  if (
                    isComponentName(componentName.value.trim()) &&
                    !this._project?.hasComponent(componentName.value.trim())
                  ) {
                    const attributeValueRange = this._html.getAttributeValueRange(node, attr.name)!

                    this.addDiagnostics('outletElements', {
                      message: 'Component does not exist.',
                      severity: 'warning',
                      from: attributeValueRange.from + componentName.from,
                      to: attributeValueRange.from + componentName.to,
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
}
