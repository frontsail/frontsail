import { split, uniqueArray } from '@frontsail/utils'
import { Element } from 'parse5/dist/tree-adapters/default'
import { HTML } from './HTML'
import { Project } from './Project'
import { Template } from './Template'
import { AtLeastOne } from './types/generic'
import { TemplateDiagnostics } from './types/template'
import { isAlpineDirective, isComponentName } from './validation'

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
   * Template type.
   */
  protected _type: 'component' | 'page' = 'component'

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
   * Create a new instance of this class instance using its id and raw HTML contents.
   * Diagnostics are not cloned.
   */
  clone(): Component {
    return new Component(this._id, this._html.getRawHTML(), this._project)
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

  /**
   * Remove Alpine directives in elements without the `x-bind` directive and add a
   * generic `x-bind` value to them. Add `x-data` to the root element.
   *
   * @returns a new HTML instance.
   * @throws an error if a project is not defined.
   */
  resolveAlpineDirectives(): HTML {
    if (!this._project) {
      throw new Error('Cannot resolve Alpine directives without a project.')
    } else if (this._project.isDevelopment()) {
      return this._html.clone()
    }

    const html = this._html.clone()
    const componentIndex = this._project.getComponentIndex(this._id)

    let xBindIndex: number = 1
    let shouldHaveXData: boolean = false

    for (const node of html.walk()) {
      if (HTML.adapter.isElementNode(node)) {
        const hasXBind = node.attrs.find((attr) => attr.name === 'x-bind')

        let shouldHaveXBind: boolean = false

        for (const attr of node.attrs) {
          if (isAlpineDirective(attr.name)) {
            if (hasXBind) {
              if (attr.name.startsWith('@')) {
                attr.name = 'x-on:' + attr.name.slice(1)
              } else if (attr.name.startsWith(':')) {
                attr.name = 'x-bind:' + attr.name.slice(1)
              }
            } else if (!['x-bind', 'x-cloak'].includes(attr.name)) {
              if (attr.name !== 'x-data') {
                shouldHaveXBind = true
              }

              attr.name = ''
            }

            shouldHaveXData = true
          }
        }

        if (shouldHaveXBind) {
          node.attrs.push({ name: 'x-bind', value: `_c${componentIndex}b${xBindIndex}_D` })
          xBindIndex++
        }

        node.attrs = node.attrs.filter((attr) => attr.name)
      }
    }

    if (shouldHaveXData) {
      const rootNode = html.getRootNodes()[0] as Element
      rootNode.attrs.unshift({ name: 'x-data', value: `_c${componentIndex}_D` })
    }

    return new HTML(html.toString())
  }
}
