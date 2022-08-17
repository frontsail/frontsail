import { clearArray, uniqueArray } from '@frontsail/utils'
import { defaultTreeAdapter, parse, parseFragment, serialize } from 'parse5'
import {
  ChildNode,
  Document,
  DocumentFragment,
  Element,
  Node,
} from 'parse5/dist/tree-adapters/default'
import { Diagnostics } from './Diagnostics'
import { JS } from './JS'
import { Range } from './types/code'
import { AtLeastOne } from './types/generic'
import { AttributeValue, HTMLDiagnostics, MustacheTag } from './types/html'
import {
  isAssetPath,
  isAttributeName,
  isComponentName,
  isEnclosed,
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
 * - **Asset** - A file located in the `assets` directory.
 *
 * - **AST** - Refers to the HTML abstract sytax tree built with parse5.
 *
 * - **Global** - Refers to a globally accessible string variable that can be
 *   interpolated across templates. Global names are always written in upper
 *   snake case (e.g. 'DESCRIPTION', 'COPYRIGHT_YEAR', etc.).
 *
 * - **Include** - Refers to using the special `<include>` tag to render asset file
 *   contents or components.
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
 * - **parse5** - An HTML open source parsing and serialization toolset.
 *
 * - **Property** - Refers to a scoped string variable that can only be accessed and
 *   interpolated within a specific template. Property names are always written in
 *   lower snake case (e.g. 'size', 'shadow_opacity', etc.).
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
    attributeNames: [],
    ifAttributes: [],
    includeElements: [],
    syntax: [],
  }

  /**
   * Instantiate with an abstract syntax tree and extract property names.
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
   */
  protected _extractPropertyNames(): void {
    const propertyNames: string[] = []

    this.getMustaches().forEach((mustache) => {
      if (isPropertyName(mustache.variable)) {
        propertyNames.push(mustache.variable)
      }
    })

    this.getAttributeValues('if').forEach((item) => {
      if (item.element.tagName !== 'slot') {
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
   */
  getElement(tagName: string = '*', attributes: { [name: string]: string } = {}): Element | null {
    return this.getElements(tagName, attributes, 1)[0] ?? null
  }

  /**
   * Find element nodes in the AST by a specified `tagName` and `attributes`. Use the
   * wildcard (`*`) character to match all elements.
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
   * Extract all `{{ mustache_tags }}` from the HTML code.
   */
  getMustaches(): MustacheTag[] {
    const regex = /{{\s*(.*?)\s*}}/g
    const mustaches: MustacheTag[] = []
    let match: RegExpExecArray | null

    do {
      match = regex.exec(this._html)

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
   * Get a list of all nodes in the AST in the order they appear in the HTML.
   */
  getNodes(): Node[] {
    return [...this.walk()]
  }

  /**
   * Get all extracted property names found in the HTML.
   */
  getPropertyNames(): string[] {
    return [...this._propertyNames]
  }

  /**
   * Analyze all nodes in the AST and run the specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getDiagnostics()`.
   */
  lint(...tests: AtLeastOne<HTMLDiagnostics>): this {
    if (!this.hasProblems('syntax')) {
      this.clearDiagnostics(...tests)

      for (const node of this.walk()) {
        if (HTML.adapter.isElementNode(node)) {
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

                if (node.tagName === 'slot') {
                  this.addDiagnostics('ifAttributes', {
                    message: 'If statements cannot be used in slots.',
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
            let includes: 'asset' | 'component' | 'both' | null = null

            for (const attr of node.attrs) {
              if ((attr.name === 'asset' || attr.name === 'component') && includes) {
                includes = 'both'

                this.addDiagnostics('includeElements', {
                  message: 'Assets and componets cannot be included at the same time.',
                  severity: 'warning',
                  from: node.sourceCodeLocation!.startTag!.startOffset,
                  to: node.sourceCodeLocation!.startTag!.endOffset,
                })
              }

              if (attr.name === 'asset') {
                if (includes !== 'both') {
                  includes = 'asset'
                }

                if (!isAssetPath(attr.value)) {
                  this.addDiagnostics('includeElements', {
                    message: 'Invalid asset path format.',
                    severity: 'warning',
                    ...this.getAttributeValueRange(node, attr.name)!,
                  })
                }
              } else if (attr.name === 'component') {
                if (includes !== 'both') {
                  includes = 'component'
                }

                if (!isComponentName(attr.value)) {
                  this.addDiagnostics('includeElements', {
                    message: 'Invalid component name format.',
                    severity: 'warning',
                    ...this.getAttributeValueRange(node, attr.name)!,
                  })
                }
              } else if (attr.name !== 'if' && !isPropertyName(attr.name)) {
                this.addDiagnostics('includeElements', {
                  message: 'Invalid property name format.',
                  severity: 'warning',
                  ...HTML.getAttributeNameRange(node, attr.name)!,
                })
              }
            }

            if (includes === 'asset') {
              for (const attr of node.attrs) {
                if (!['asset', 'component', 'if'].includes(attr.name)) {
                  this.addDiagnostics('includeElements', {
                    message: 'Properties cannot be used when including an asset.',
                    severity: 'warning',
                    ...HTML.getAttributeNameRange(node, attr.name)!,
                  })
                }
              }
            } else if (!includes) {
              this.addDiagnostics('includeElements', {
                message: "Missing attribute 'asset' or 'component'.",
                severity: 'warning',
                from: node.sourceCodeLocation!.startTag!.startOffset,
                to: node.sourceCodeLocation!.startTag!.endOffset,
              })
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
        for (const childNode of HTML.adapter.getChildNodes(node)) {
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
