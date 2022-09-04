import { hash, slugify, uniqueArray } from '@frontsail/utils'
import { Element, Template as TemplateElement } from 'parse5/dist/tree-adapters/default'
import { HTML } from './HTML'
import { JS } from './JS'
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
 * - **Alpine** - A lightweight JavaScript framework ([link](https://alpinejs.dev/)).
 *   Values from Alpine directives are extracted from all elements and appended into
 *   the project's script file. Only the `x-data` (with the template key), `x-bind`,
 *   `x-for`, and `x-cloak` attributes remain in the HTML.
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
   * Cache for the latest resolved Alpine data.
   */
  protected _jsCache: { checksum: number; js: string } = { checksum: 0, js: '' }

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
      const suggestion = name
        .split('/')
        .map((part) => slugify(part, '-', true))
        .join('/')

      throw new Error(`The component name '${name}' is not valid. Try with '${suggestion}'.`)
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
    this._outletNames.push(...uniqueArray(outletNames))
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
      rootNodes.forEach((rootNode, index) => {
        if (HTML.adapter.isElementNode(rootNode)) {
          if (rootNode.tagName === 'template') {
            this.addDiagnostics('templateSpecific', {
              message: 'Templates cannot be used as root nodes.',
              severity: 'error',
              from: rootNode.sourceCodeLocation!.startTag!.startOffset,
              to: rootNode.sourceCodeLocation!.startTag!.endOffset,
            })
          }

          for (const attr of rootNode.attrs) {
            if (['x-if', 'x-for'].includes(attr.name)) {
              this.addDiagnostics('templateSpecific', {
                message: `The '${attr.name}' directive cannot be used in the root element.`,
                severity: 'error',
                ...this._html.getAttributeNameRange(rootNode, attr.name)!,
              })
            }
          }
        }

        if (index > 0) {
          this.addDiagnostics('templateSpecific', {
            message: 'Components can have only one root node.',
            severity: 'error',
            from: rootNode.sourceCodeLocation!.startOffset,
            to: rootNode.sourceCodeLocation!.endOffset,
          })
        }
      })
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
                this.addDiagnostics('alpineDirectives', {
                  message: "The 'x-data' directive can only be used in the root element.",
                  severity: 'error',
                  ...this._html.getAttributeNameRange(node, attr.name)!,
                })
              } else if (attr.name === 'x-bind' && /^_c[0-9]+b[0-9]+_D$/.test(attr.value)) {
                this.addDiagnostics('alpineDirectives', {
                  message: 'Reserved name.',
                  severity: 'error',
                  ...this._html.getAttributeValueRange(node, attr.name)!,
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
          }
        }
      }
    }

    return this
  }

  /**
   * Resolve Alpine templates and directives.
   *
   * @returns a new HTML instance.
   * @throws an error if a project is not defined.
   */
  prepareHTML(): HTML {
    const html = this._html.clone()

    this._resolveAlpineTemplates(html)
    this._resolveAlpineDirectives(html)

    return new HTML(html.toString())
  }

  /**
   * Move all Alpine directives into a reusable Alpine data component and prepend all
   * moved data properties with the `this` keyword. Bindings are identified with a
   * unique component index in the project.
   *
   * **Caveats:**
   *
   * - When accessing properties of parent components, always precede them with the
   *   `this` keyword.
   * - When accessing `window` variables with coincident names with properties, prefix
   *   them with `window`.
   *
   * @returns JavaScript code.
   * @throws an error if a project is not defined.
   */
  resolveAlpineData(): string {
    if (!this._project) {
      throw new Error('Cannot resolve Alpine data without a project.')
    }

    const componentIndex = this._project.getComponentIndex(this._id)
    const key = this._project.isProduction() ? `c${componentIndex}` : `${this._id}__`
    const checksum = hash(key + this._html.getRawHTML())

    let inlineCSSIndex: number = 1

    if (this._jsCache.checksum !== checksum) {
      const componentIndex = this._project.getComponentIndex(this._id)
      const rootNodes = this._html.getRootNodes()
      const rootElement =
        rootNodes.length === 1 && HTML.adapter.isElementNode(rootNodes[0]) ? rootNodes[0] : null

      if (!rootElement) {
        return ''
      }

      const xData = rootElement.attrs.find((attr) => attr.name === 'x-data')?.value ?? '{}'
      const data = new JS(xData, true)

      let xBindIndex: number = 1
      let shouldHaveXData: boolean = false

      if (data.hasProblems('syntax')) {
        return ''
      }

      const dataProperties = [
        ...data.getObjectProperties(),
        ...['$data', '$dispatch', '$el', '$id', '$nextTick', '$refs', '$root', '$store', '$watch'],
      ]
      const runtime: { element: Element; properties: string[] }[] = []
      const bindings: string[] = []

      for (const node of this._html.walk()) {
        if (HTML.adapter.isElementNode(node)) {
          const hasXBind = node.attrs.some((attr) => attr.name === 'x-bind')
          const xForAttribute = node.attrs.find((attr) => attr.name === 'x-for')
          const bindingProperties: string[] = []

          if (xForAttribute) {
            const xFor = JS.parseForExpression(xForAttribute.value)

            if (xFor) {
              let runtimeItem = runtime.find((item) => item.element === node)

              if (!runtimeItem) {
                runtimeItem = { element: node, properties: [] }
                runtime.push(runtimeItem)
              }

              if (xFor.item) {
                runtimeItem.properties.push(xFor.item)
              }

              if (xFor.index) {
                runtimeItem.properties.push(xFor.index)
              }
            }
          }

          for (const attr of node.attrs) {
            if (isAlpineDirective(attr.name)) {
              if (node.attrs.some((attr) => attr.name === 'css')) {
                const bindClassAttribute = node.attrs.find((attr) => {
                  return /^(?:x-bind)?:class$/.test(attr.name)
                })

                if (bindClassAttribute) {
                  bindClassAttribute.value = bindClassAttribute.value.replace(
                    /%([a-z][a-zA-Z0-9]*)/g,
                    `_${key}e${inlineCSSIndex}_$1_D`,
                  )
                }

                inlineCSSIndex++
              }

              if (!hasXBind && !['x-data', 'x-bind', 'x-for', 'x-cloak'].includes(attr.name)) {
                const runtimeProperties: string[] = []
                let relative: Element | null = node

                while (relative) {
                  const runtimeItem = runtime.find((item) => item.element === relative)
                  const parent = HTML.adapter.getParentNode(relative)

                  if (runtimeItem) {
                    runtimeProperties.push(...runtimeItem.properties)
                  }

                  relative = parent && HTML.adapter.isElementNode(parent) ? parent : null
                }

                const expression = new JS(attr.value, true).addThis([
                  ...dataProperties,
                  ...runtimeProperties,
                ])

                bindingProperties.push(
                  `      '${attr.name}'() {\n        return ${expression}\n      }`,
                )
              }

              shouldHaveXData = true
            }
          }

          if (bindingProperties.length > 0) {
            bindings.push(
              `    _c${componentIndex}b${xBindIndex}_D: {\n${bindingProperties.join(',\n')}\n    }`,
            )

            xBindIndex++
          }
        }
      }

      if (shouldHaveXData) {
        const trimmed = xData.trim().replace(/\s*,?\s*}\s*$/, '')
        const newXData = (trimmed === '{' ? '{\n' : `${trimmed},\n`) + bindings.join(',\n')

        this._jsCache.checksum = checksum
        this._jsCache.js = `  Alpine.data('_c${componentIndex}_D', () => (${newXData}\n  }))`
      }
    }

    return this._jsCache.js
  }

  /**
   * Remove Alpine directives in elements without the `x-bind` directive and add a
   * generic `x-bind` value to them. Add `x-data` to the root element.
   *
   * @throws an error if a project is not defined.
   */
  protected _resolveAlpineDirectives(html: HTML): HTML {
    if (!this._project) {
      throw new Error('Cannot resolve Alpine directives without a project.')
    }

    const componentIndex = this._project.getComponentIndex(this._id)

    let xBindIndex: number = 1
    let shouldHaveXData: boolean = false

    for (const node of html.walk()) {
      if (HTML.adapter.isElementNode(node)) {
        const hasXBind = node.attrs.some((attr) => attr.name === 'x-bind')

        let shouldHaveXBind: boolean = false

        for (const attr of node.attrs) {
          if (isAlpineDirective(attr.name)) {
            if (hasXBind) {
              if (attr.name.startsWith('@')) {
                attr.name = 'x-on:' + attr.name.slice(1)
              } else if (attr.name.startsWith(':')) {
                attr.name = 'x-bind:' + attr.name.slice(1)
              }
            } else if (!['x-bind', 'x-for', 'x-cloak'].includes(attr.name)) {
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

    return html
  }

  /**
   * Wrap non-template elements with `x-if` and `x-for` directives into auto-generated
   * `<template>` elements.
   *
   * @throws an error if a project is not defined.
   */
  protected _resolveAlpineTemplates(html: HTML): HTML {
    if (!this._project) {
      throw new Error('Cannot resolve Alpine directives without a project.')
    }

    const xIfElements: Element[] = []
    const xForElements: Element[] = []

    for (const node of html.walk()) {
      if (HTML.adapter.isElementNode(node) && node.tagName !== 'template') {
        if (node.attrs.some((attr) => attr.name === 'x-if')) {
          xIfElements.push(node)
        }

        if (node.attrs.some((attr) => attr.name === 'x-for')) {
          xForElements.push(node)
        }
      }
    }

    for (const directive of ['x-if', 'x-for']) {
      const elements = directive === 'x-if' ? xIfElements : xForElements

      for (const element of elements) {
        const index = element.attrs.findIndex((attr) => attr.name === directive)
        const parent = HTML.adapter.getParentNode(element)!
        const template = HTML.createElement(
          'template',
          Object.fromEntries([[directive, element.attrs[index].value]]),
        ) as TemplateElement
        const templateContent = HTML.adapter.createDocumentFragment()

        HTML.adapter.insertBefore(parent, template, element)
        HTML.adapter.detachNode(element)
        HTML.adapter.setTemplateContent(template, templateContent)
        HTML.adapter.appendChild(templateContent, element)

        element.attrs.splice(index, 1)
      }
    }

    return html
  }
}
