import { clearArray, split, uniqueArray } from '@frontsail/utils'
import { defaultTreeAdapter, parse, parseFragment, serialize } from 'parse5'
import {
  ChildNode,
  Document,
  DocumentFragment,
  Element,
  Node,
  Template,
} from 'parse5/dist/tree-adapters/default'
import { Diagnostics } from './Diagnostics'
import { JS } from './JS'
import { Range } from './types/code'
import { AtLeastOne } from './types/generic'
import { AttributeValue, HTMLDiagnostics, MustacheTag } from './types/html'
import {
  isAlpineDirective,
  isAttributeName,
  isComponentName,
  isEnclosed,
  isGlobalName,
  isPropertyName,
} from './validation'

/**
 * Required HTML namespace which export is missing in parse5.
 */
enum NS {
  HTML = 'http://www.w3.org/1999/xhtml',
}

/**
 * Parses and transforms an HTML string into an abstract syntax tree using
 * [parse5](https://github.com/inikulin/parse5).
 *
 * The class provides functionalities that meet the needs of FrontSail projects.
 * It is not a full-featured HTML manipulation tool.
 *
 * @see {@link https://parse5.js.org/modules/parse5.html parse5 documentation} for
 * more details on the AST.
 *
 * ---
 *
 * Glossary:
 *
 * - **AST** - Refers to the HTML abstract sytax tree built with parse5.
 *
 * - **Global** - Refers to a globally accessible string variable that can be
 *   interpolated across templates. Global names are always written in upper
 *   snake case (e.g. 'DESCRIPTION', 'COPYRIGHT_YEAR', etc.).
 *
 * - **Include** - Refers to using the special `<include>` tag to render components.
 *
 * - **Inject** - Refers to a special `<inject>` element for inserting its child nodes
 *   into a component outlet. These elements must be directly nested within `<include>`
 *   elements. Inject tags can have an `into` attribute whose value must match an
 *   existing outlet name. If omitted, the 'main' outlet is targeted by default.
 *
 * - **Interpolation** - Refers to embedding expressions using the "Mustache" syntax
 *   (double curly braces). Only globals (e.g. `{{ HOME_URL }}`) and properties
 *   (e.g. `{{ icon_size }}`) can be interpolated. Interpolation cannot be used in
 *   attribute names and special attributes, like `css` and Alpine directives.
 *
 * - **Mustache tag** - Refers to a string beginning and ending with double curly
 *   braces, like `{{ color }}`.
 *
 * - **Mustache variable** - Refers to the text between the curly braces in a mustache
 *   tag. The expected value is a global or property.
 *
 * - **Outlet** - Refers to a special component-only `<outlet>` element that is replaced
 *   during the render phase by child nodes of `<inject>` elements used in parent
 *   templates. Outlets can only have one `name` attribute, which must be unique within
 *   the component. If omitted, the output is named 'main' by default. Outlet elements
 *   can contain child nodes that are rendered if the parent template does not specify
 *   an associated `<inject>` tag.
 *
 * - **parse5** - An HTML open source parsing and serialization toolset.
 *
 * - **Property** - Refers to a scoped string variable that can only be accessed and
 *   interpolated within a specific template. Property names are always written in
 *   lower snake case (e.g. 'size', 'shadow_opacity', etc.).
 *
 * - **Template** - Refers to a component or page.
 */
export class HTML extends Diagnostics<HTMLDiagnostics> {
  /**
   * The adapter is a set of utility functions that provides minimal required
   * abstraction layer beetween the parse5 parser and a specific AST format.
   */
  static adapter = defaultTreeAdapter

  /**
   * Raw HTML content that is transformed to an AST.
   */
  protected _html: string

  /**
   * The abstract syntax tree created from the input HTML.
   */
  protected _ast?: Document | DocumentFragment

  /**
   * Alphabetically sorted property names found in mustache tags and if attributes
   * in the AST.
   */
  protected _propertyNames: string[] = []

  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: HTMLDiagnostics = {
    alpineDirectives: [],
    attributeNames: [],
    ifAttributes: [],
    includeElements: [],
    injectElements: [],
    mustacheLocations: [],
    mustacheValues: [],
    outletElements: [],
    syntax: [],
  }

  /**
   * Instantiate with an abstract syntax tree and extract property names.
   *
   * @param html The HTML code to parse.
   */
  constructor(html: string) {
    super()

    this._html = html

    try {
      this._ast = html.trim().startsWith('<!DOCTYPE html>')
        ? parse(html, { sourceCodeLocationInfo: true })
        : parseFragment(html, { sourceCodeLocationInfo: true })
      this._extractPropertyNames()
    } catch (e) {
      this.addDiagnostics('syntax', {
        message: e.message,
        severity: 'error',
        from: 0,
        to: html.length,
      })
    }
  }

  /**
   * Create a new instance of this class instance using its raw HTML contents.
   * Diagnostics are not cloned.
   */
  clone(): HTML {
    return new HTML(this._html)
  }

  /**
   * Create a new parse5 element node.
   */
  static createElement(tagName: string, attributes: { [name: string]: string } = {}): Element {
    return HTML.adapter.createElement(
      tagName,
      NS.HTML,
      Object.entries(attributes).map(([name, value]) => ({ name, value })),
    )
  }

  /**
   * Find and store property names used in the HTML.
   *
   * @throws an error if the AST is not defined.
   */
  protected _extractPropertyNames(): void {
    const propertyNames: string[] = []

    this.getMustaches().forEach((mustache) => {
      if (isPropertyName(mustache.variable)) {
        propertyNames.push(mustache.variable)
      }
    })

    this.getAttributeValues('if').forEach((item) => {
      if (item.element.tagName !== 'outlet') {
        const js = new JS(item.text)

        if (js.isIfAttributeValue()) {
          propertyNames.push(...js.getIdentifiers())
        }
      }
    })

    clearArray(this._propertyNames).push(...uniqueArray(propertyNames).sort())
  }

  /**
   * Get the range of an attribute name in the HTML.
   *
   * @returns null if the `attributeName` doesn't exist in the `element` attributes.
   */
  static getAttributeNameRange(element: Element, attributeName: string): Range | null {
    const attr = element.attrs.find((attr) => attr.name === attributeName)

    if (attr) {
      return {
        from: element.sourceCodeLocation!.attrs![attributeName].startOffset,
        to: element.sourceCodeLocation!.attrs![attributeName].startOffset + attributeName.length,
      }
    }

    return null
  }

  /**
   * Get the range of an attribute name in the HTML.
   *
   * @alias HTML.getAttributeNameRange
   * @returns null if the `attributeName` doesn't exist in the `element` attributes.
   */
  getAttributeNameRange(element: Element, attributeName: string): Range | null {
    return HTML.getAttributeNameRange(element, attributeName)
  }

  /**
   * Get the range of an attribute value in the HTML without its surrounding quotes.
   *
   * @returns null if the `attributeName` doesn't exist in the `element` attributes.
   */
  getAttributeValueRange(element: Element, attributeName: string): Range | null {
    const attr = element.attrs.find((attr) => attr.name === attributeName)

    if (attr) {
      const endOffset = element.sourceCodeLocation!.attrs![attributeName].endOffset
      const hasQuotes = isEnclosed(this._html.slice(endOffset - attr.value.length - 2, endOffset), [
        '"',
        "'",
      ])

      return {
        from: endOffset - +hasQuotes - attr.value.length,
        to: endOffset - +hasQuotes,
      }
    }

    return null
  }

  /**
   * Get attribute values from all elements in the AST by a specified `attributeName`.
   *
   * @throws an error if the AST is not defined.
   */
  getAttributeValues(attributeName: string): AttributeValue[] {
    const attributes: AttributeValue[] = []

    for (const node of this.walk()) {
      if (HTML.adapter.isElementNode(node)) {
        const attr = node.attrs.find((_attr) => _attr.name === attributeName)

        if (attr) {
          attributes.push({
            text: attr.value,
            element: node,
            ...this.getAttributeValueRange(node, attributeName)!,
          })
        }
      }
    }

    return attributes
  }

  /**
   * Find an element node in the AST by a specified `tagName` and `attributes`. Use the
   * wildcard (`*`) character to match all elements.
   *
   * @throws an error if the AST is not defined.
   */
  getElement(tagName: string = '*', attributes: { [name: string]: string } = {}): Element | null {
    return this.getElements(tagName, attributes, 1)[0] ?? null
  }

  /**
   * Find element nodes in the AST by a specified `tagName` and `attributes`. Use the
   * wildcard (`*`) character to match all elements.
   *
   * @throws an error if the AST is not defined.
   */
  getElements(
    tagName: string = '*',
    attributes: { [name: string]: string } = {},
    limitResults: number = Infinity,
  ): Element[] {
    const elements: Element[] = []

    for (const node of this.getNodes()) {
      if (limitResults <= elements.length) {
        return elements
      }

      if (
        HTML.adapter.isElementNode(node) &&
        (tagName === '*' || node.tagName === tagName) &&
        Object.entries(attributes).every(([name, value]) => {
          return node.attrs.find((attr) => attr.name === name)?.value === value
        })
      ) {
        elements.push(node)
      }
    }

    return elements
  }

  /**
   * Get the outlet name from an `<inject>` `element` by looking up its `into` attribute.
   */
  static getInjectIntoValue(element: Element): string {
    return element.attrs.find((attr) => attr.name === 'into')?.value ?? 'main'
  }

  /**
   * Get a list of all `{{ mustache_tags }}` in a HTML code.
   */
  static getMustaches(html: string): MustacheTag[] {
    const regex = /{{\s*(.*?)\s*}}/g
    const mustaches: MustacheTag[] = []
    let match: RegExpExecArray | null

    do {
      match = regex.exec(html)

      if (match) {
        mustaches.push({
          text: match[0],
          variable: match[1],
          from: match.index,
          to: match.index + match[0].length,
        })
      }
    } while (match)

    return mustaches
  }

  /**
   * Get a list of all `{{ mustache_tags }}` in the HTML code.
   */
  getMustaches(): MustacheTag[] {
    return HTML.getMustaches(this._html)
  }

  /**
   * Get a list of all nodes in the AST in the order they appear in the HTML.
   *
   * @throws an error if the AST is not defined.
   */
  getNodes(): Node[] {
    return [...this.walk()]
  }

  /**
   * Get the outlet name from an `<outlet>` `element` by looking up its `name` attribute.
   */
  static getOutletName(element: Element): string {
    return element.attrs.find((attr) => attr.name === 'name')?.value ?? 'main'
  }

  /**
   * Get all extracted property names found in the HTML.
   */
  getPropertyNames(): string[] {
    return [...this._propertyNames]
  }

  /**
   * Check if a `node` has a parent element with a specific `tagName`.
   */
  static hasParent(node: Node, tagName: string): boolean {
    let parent = this.adapter.getParentNode(node)

    while (parent && this.adapter.isElementNode(parent)) {
      if (parent.tagName === tagName) {
        return true
      }

      parent = this.adapter.getParentNode(parent)
    }

    return false
  }

  /**
   * Analyze all nodes in the AST and run the specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getDiagnostics()`.
   */
  lint(...tests: AtLeastOne<HTMLDiagnostics>): this {
    if (!this.hasProblems('syntax')) {
      this.clearDiagnostics(...tests)

      // Check mustache values
      //
      if (this.shouldTest('mustacheValues', tests)) {
        for (const mustache of this.getMustaches()) {
          if (!isPropertyName(mustache.variable) && !isGlobalName(mustache.variable)) {
            const from = mustache.from + mustache.text.indexOf(mustache.variable)

            this.addDiagnostics('mustacheValues', {
              message: 'Invalid variable name.',
              severity: 'error',
              from,
              to: from + mustache.variable.length,
            })
          }
        }
      }

      for (const node of this.walk()) {
        if (HTML.adapter.isElementNode(node)) {
          //
          // Check Alpine directives
          //
          if (this.shouldTest('alpineDirectives', tests)) {
            for (const attr of node.attrs) {
              if (isAlpineDirective(attr.name) && attr.value) {
                const js = new JS(attr.value, true)

                if (js.hasProblems('*')) {
                  this.addDiagnostics(
                    'alpineDirectives',
                    ...js.getDiagnosticsWithOffset(
                      this.getAttributeValueRange(node, attr.name)!.from,
                      '*',
                    ),
                  )
                }

                if (attr.name === 'x-data' && !js.isObject()) {
                  this.addDiagnostics('alpineDirectives', {
                    message: 'Alpine data must be an object.',
                    severity: 'error',
                    ...this.getAttributeValueRange(node, attr.name)!,
                  })
                }
              }
            }
          }
          //
          // Check attribute names
          //
          if (this.shouldTest('attributeNames', tests)) {
            for (const attr of node.attrs) {
              if (!isAttributeName(attr.name)) {
                this.addDiagnostics('attributeNames', {
                  message:
                    attr.name.startsWith('{{') || attr.name.endsWith('}}')
                      ? 'Mustache syntax is not allowed in attribute names.'
                      : 'Invalid attribute name.',
                  severity: 'warning',
                  from: node.sourceCodeLocation!.attrs![attr.name].startOffset,
                  to: node.sourceCodeLocation!.attrs![attr.name].startOffset + attr.name.length,
                })
              }
            }
          }
          //
          // Check if attributes
          //
          if (this.shouldTest('ifAttributes', tests)) {
            for (const attr of node.attrs) {
              if (attr.name === 'if') {
                const js = new JS(attr.value)

                if (node.tagName === 'outlet') {
                  this.addDiagnostics('ifAttributes', {
                    message: 'If statements cannot be used in outlets.',
                    severity: 'warning',
                    ...HTML.getAttributeNameRange(node, attr.name)!,
                  })
                }

                if (js.isIfAttributeValue()) {
                  js.evaluate(Object.fromEntries(this._propertyNames.map((p) => [p, ''])))

                  if (js.hasProblems('*')) {
                    this.addDiagnostics(
                      'ifAttributes',
                      ...js.getDiagnosticsWithOffset(
                        this.getAttributeValueRange(node, attr.name)!.from,
                        '*',
                      ),
                    )
                  }
                } else {
                  this.addDiagnostics('ifAttributes', {
                    message: 'Call expressions and declarations are not allowed.',
                    severity: 'error',
                    ...this.getAttributeValueRange(node, attr.name)!,
                  })
                }
              }
            }
          }
          //
          // Check include elements
          //
          if (node.tagName === 'include' && this.shouldTest('includeElements', tests)) {
            for (const attr of node.attrs) {
              if (attr.name === 'component') {
                if (!isComponentName(attr.value)) {
                  this.addDiagnostics('includeElements', {
                    message: 'Invalid component name.',
                    severity: 'warning',
                    ...this.getAttributeValueRange(node, attr.name)!,
                  })
                }
              } else if (attr.name !== 'if' && !isPropertyName(attr.name)) {
                this.addDiagnostics('includeElements', {
                  message: 'Invalid property name.',
                  severity: 'warning',
                  ...HTML.getAttributeNameRange(node, attr.name)!,
                })
              }
            }

            if (!node.attrs.some((attr) => attr.name === 'component')) {
              this.addDiagnostics('includeElements', {
                message: "Missing 'component' attribute.",
                severity: 'warning',
                from: node.sourceCodeLocation!.startTag!.startOffset,
                to: node.sourceCodeLocation!.startTag!.endOffset,
              })
            }
          }
          //
          // Check inject elements
          //
          if (node.tagName === 'inject' && this.shouldTest('injectElements', tests)) {
            const parent = HTML.adapter.getParentNode(node)

            if (parent && HTML.adapter.isElementNode(parent) && parent.tagName === 'include') {
              const intoValue = HTML.getInjectIntoValue(node)
              const siblings = parent.childNodes.filter((childNode) => {
                return (
                  (HTML.adapter.isElementNode(childNode) && childNode !== node) ||
                  (HTML.adapter.isTextNode(childNode) && childNode.value.trim())
                )
              }) as Node[]
              const duplicateExists = siblings.some((sibling) => {
                return (
                  HTML.adapter.isElementNode(sibling) &&
                  sibling.tagName === 'inject' &&
                  HTML.getInjectIntoValue(sibling) === intoValue
                )
              })

              if (!intoValue) {
                this.addDiagnostics('injectElements', {
                  message: 'Missing outlet name.',
                  severity: 'warning',
                  ...this.getAttributeNameRange(node, 'into')!,
                })
              } else if (duplicateExists) {
                const valueRange = this.getAttributeValueRange(node, 'into')
                const from = valueRange?.from ?? node.sourceCodeLocation!.startTag!.startOffset
                const to = valueRange?.to ?? node.sourceCodeLocation!.startTag!.endOffset

                this.addDiagnostics('injectElements', {
                  message: 'Duplicate injection.',
                  severity: 'warning',
                  from,
                  to,
                })
              }

              for (const sibling of siblings) {
                if (
                  (HTML.adapter.isElementNode(sibling) && sibling.tagName !== 'inject') ||
                  HTML.adapter.isTextNode(sibling)
                ) {
                  this.addDiagnostics('injectElements', {
                    message: 'When using inject tags, all other nodes must be nested inside them.',
                    severity: 'error',
                    from: sibling.sourceCodeLocation!.startOffset,
                    to: sibling.sourceCodeLocation!.endOffset,
                  })
                }
              }
            } else {
              this.addDiagnostics('injectElements', {
                message: "Inject tags must be directly nested within 'include' elements.",
                severity: 'error',
                from: node.sourceCodeLocation!.startOffset,
                to: node.sourceCodeLocation!.endOffset,
              })
            }

            for (const attr of node.attrs) {
              if (!['if', 'into'].includes(attr.name)) {
                this.addDiagnostics('injectElements', {
                  message: 'Unsupported attribute.',
                  severity: 'warning',
                  ...this.getAttributeNameRange(node, attr.name)!,
                })
              }
            }
          }
          //
          // Check mustache locations
          //
          if (this.shouldTest('mustacheLocations', tests)) {
            for (const attr of node.attrs) {
              for (const mustache of HTML.getMustaches(attr.value)) {
                const attributeValueRange = this.getAttributeValueRange(node, attr.name)!
                const from = attributeValueRange.from + mustache.from
                const to = attributeValueRange.from + mustache.to

                if (isAlpineDirective(attr.name)) {
                  this.addDiagnostics('mustacheLocations', {
                    message: 'Mustaches cannot be used in Alpine directives.',
                    severity: 'error',
                    from,
                    to,
                  })
                } else if (
                  attr.name === 'if' ||
                  (node.tagName === 'include' && attr.name === 'component') ||
                  (node.tagName === 'inject' && attr.name === 'into') ||
                  (node.tagName === 'outlet' && ['allow', 'name'].includes(attr.name))
                ) {
                  this.addDiagnostics('mustacheLocations', {
                    message: `Mustaches cannot be used in '${attr.name}' attributes.`,
                    severity: 'error',
                    from,
                    to,
                  })
                }
              }
            }
          }
          //
          // Check outlet elements
          //
          if (node.tagName === 'outlet' && this.shouldTest('outletElements', tests)) {
            const name = HTML.getOutletName(node)
            const siblings = this.getElements('outlet').filter((sibling) => sibling !== node)
            const duplicateExists = siblings.some((sibling) => HTML.getOutletName(sibling) === name)

            if (!name) {
              this.addDiagnostics('outletElements', {
                message: 'Missing outlet name.',
                severity: 'warning',
                ...this.getAttributeNameRange(node, 'name')!,
              })
            } else if (duplicateExists) {
              const valueRange = this.getAttributeValueRange(node, 'name')
              const from = valueRange?.from ?? node.sourceCodeLocation!.startTag!.startOffset
              const to = valueRange?.to ?? node.sourceCodeLocation!.startTag!.endOffset

              this.addDiagnostics('outletElements', {
                message: 'Duplicate outlet name.',
                severity: 'warning',
                from,
                to,
              })
            }

            if (HTML.hasParent(node, 'outlet')) {
              this.addDiagnostics('outletElements', {
                message: 'Outlets cannot be nested within each other.',
                severity: 'error',
                from: node.sourceCodeLocation!.startOffset,
                to: node.sourceCodeLocation!.endOffset,
              })
            } else if (HTML.hasParent(node, 'include')) {
              this.addDiagnostics('outletElements', {
                message: "Outlets cannot be nested within 'include' elements.",
                severity: 'error',
                from: node.sourceCodeLocation!.startOffset,
                to: node.sourceCodeLocation!.endOffset,
              })
            }

            for (const attr of node.attrs) {
              if (attr.name === 'allow') {
                const componentNames = split(attr.value)

                for (const componentName of componentNames) {
                  if (!isComponentName(componentName.value.trim())) {
                    const attributeValueRange = this.getAttributeValueRange(node, attr.name)!

                    this.addDiagnostics('outletElements', {
                      message: 'Invalid component name.',
                      severity: 'warning',
                      from: attributeValueRange.from + componentName.from,
                      to: attributeValueRange.from + componentName.to,
                    })
                  }
                }
              } else if (attr.name !== 'name') {
                this.addDiagnostics('outletElements', {
                  message: 'Unsupported attribute.',
                  severity: 'warning',
                  ...this.getAttributeNameRange(node, attr.name)!,
                })
              }
            }
          }
        }
      }
    }

    return this
  }

  /**
   * Replace an `element` node in its AST with a `replacement` node.
   *
   * @returns true if the `element` has been replaced.
   */
  static replaceElement(element: Element, replacement: ChildNode): boolean {
    const index = element.parentNode?.childNodes.findIndex((node) => node === element)

    if (index === undefined || index === -1) {
      return false
    }

    return element.parentNode!.childNodes.splice(index, 1, replacement).length === 1
  }

  /**
   * Serialize the AST to an HTML string.
   */
  toString(): string {
    return this._ast ? serialize(this._ast) : ''
  }

  /**
   * Walks through all nodes in the AST.
   *
   * @throws an error if the AST is not defined.
   */
  *walk(): Generator<Node, void, unknown> {
    function* iterator(node: Node) {
      yield node

      if (
        HTML.adapter.isElementNode(node) ||
        node.nodeName === '#document' ||
        node.nodeName === '#document-fragment'
      ) {
        const childNodes =
          node.nodeName === 'template'
            ? HTML.adapter.getTemplateContent(node as Template).childNodes
            : HTML.adapter.getChildNodes(node)

        for (const childNode of childNodes) {
          yield* iterator(childNode)
        }
      }
    }

    if (this._ast) {
      yield* iterator(this._ast)
    } else {
      throw new Error('The abstract syntax tree is not defined.')
    }
  }
}
