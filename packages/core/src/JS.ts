import { uniqueArray } from '@frontsail/utils'
import { Node, parse } from 'acorn'
import { findNodeAt, full, simple, SimpleVisitors } from 'acorn-walk'
import { Diagnostics } from './Diagnostics'
import { JSDiagnostics } from './types/js'

/**
 * Parses and transforms a JavaScript string into an abstract syntax tree using
 * [Acorn](https://github.com/acornjs/acorn).
 *
 * The class provides functionalities that meet the needs of FrontSail projects.
 * It is not a full-featured JavaScript manipulation tool.
 *
 * @see {@link https://github.com/acornjs/acorn Acorn repository} for
 * more details on the AST.
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
 * - **AST** - Refers to the JavaScript abstract sytax tree built with Acorn.
 *
 * - **Acorn** - A small, fast, JavaScript-based JavaScript parser.
 *
 * - **Attribute** - An HTML attribute (e.g. `<div if="foo"></div>`).
 *
 * - **Directive** - Refers to an Alpine [directive](https://alpinejs.dev/start-here).
 *
 * - **Element** - An HTML element (e.g. `<div></div>`).
 */
export class JS extends Diagnostics<JSDiagnostics> {
  /**
   * Raw JavaScript content without the prefix and suffix.
   */
  protected _rawJS: string

  /**
   * JavaScript content that is transformed to an AST.
   */
  protected _js: string

  /**
   * A code prefix used for invalid JS inputs like anonymous objects in Alpine
   * directives (e.g. `{ foo: 'bar' }`).
   */
  protected _prefix: string = ''

  /**
   * Complement to the code prefix.
   */
  protected _suffix: string = ''

  /**
   * The abstract syntax tree created from the input JS.
   */
  protected _ast?: Node

  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: JSDiagnostics = {
    runtime: [],
    syntax: [],
  }

  /**
   * Instantiate with an abstract syntax tree.
   *
   * @param js The JavaScript code.
   * @param alpineDirective Whether the code is an Alpine directive.
   */
  constructor(js: string, alpineDirective: boolean = false) {
    super()

    if (alpineDirective) {
      if (/(?:[\s\S]*?)\s+(?:in|of)\s+(?:[\s\S]*)/.test(js)) {
        this._prefix = 'for ('
        this._suffix = ') {}'
      } else {
        this._prefix = '() => { return '
        this._suffix = '}'
      }
    }

    this._rawJS = js
    this._js = this._prefix + this._rawJS + this._suffix

    try {
      this._ast = parse(this._js, { ecmaVersion: 2020 })
    } catch (e) {
      const from = Math.min(Math.max(e.pos - this._prefix.length, 0), this._rawJS.length)

      this.addDiagnostics('syntax', {
        message: e.message.replace(/ \([0-9]+:[0-9]+\)$/, '.'),
        severity: 'error',
        from,
        to: from,
      })
    }
  }

  /**
   * Add the `this` keyword to identifiers included in `targets` and return the
   * transformed JavaScript code (optimized for Alpine directives).
   */
  addThis(targets: string[]): string {
    let js = this.getRawJS()
    let diff: number = 0

    if (this._ast) {
      this.walkSimple({
        Identifier: (node: Node & { name: string }) => {
          if (targets.includes(node.name)) {
            const from = node.start - this._prefix.length + diff
            const to = node.end - this._prefix.length + diff
            js = js.slice(0, from) + `this.${node.name}` + js.slice(to)
            diff += 5 // 'this.'.length
          }
        },
      })
    }

    const assignmentIdentifiersRegex =
      /(?:^|\s|\()((?!this\.)[\$a-zA-Z_][\$a-zA-Z0-9_]*)[\$a-zA-Z0-9\.'"`_\[\]]*\s*=[^=]/gi
    let assignmentMatch: RegExpExecArray | null = null

    do {
      assignmentMatch = assignmentIdentifiersRegex.exec(js)

      if (assignmentMatch && targets.includes(assignmentMatch[1])) {
        js =
          js.slice(0, assignmentMatch.index) +
          js
            .slice(assignmentMatch.index, assignmentMatch.index + assignmentMatch[0].length)
            .replace(assignmentMatch[1], `this.${assignmentMatch[1]}`) +
          js.slice(assignmentMatch.index + assignmentMatch[0].length)
      }
    } while (assignmentMatch)

    return js
  }

  /**
   * Create a new instance of this class instance using its raw JS contents.
   * Diagnostics are not cloned.
   */
  clone(): JS {
    return new JS(this._rawJS, !!this._prefix)
  }

  /**
   * Return an evaluated JS value using the specified `variables`.
   *
   * **IMPORTANT:** DO NOT CALL THIS METHOD WITH UNKNOWN JAVASCRIPT CODE.
   */
  evaluate(variables: { [name: string]: string } = {}): any {
    if (this.hasProblems('syntax')) {
      return
    }

    // Add very basic security patches
    const sanitize = ['__dirname', '__filename', 'process']

    if (typeof window !== 'undefined') {
      sanitize.push(...Object.keys(window))
    }

    const constants = uniqueArray([...sanitize, ...Object.keys(variables)])
      .map((name) => {
        const value = variables.hasOwnProperty(name) ? variables[name] : ''
        return `const ${name} = '${value.replace(/'/g, "\\'")}'`
      })
      .join('\n')

    try {
      return Function(`${constants}\nreturn ${this._js}`).call(null)
    } catch (e) {
      this.addDiagnostics('runtime', {
        message: e.toString().replace(/^[a-z0-9]+: /i, '') + '.',
        severity: 'error',
        from: 0,
        to: this._rawJS.length,
      })
    }
  }

  /**
   * Find and return a list of identifiers in the AST.
   */
  getIdentifiers(): string[] {
    const identifiers: string[] = []

    if (this._ast) {
      this.walkSimple({
        Identifier: (node: Node & { name: string }) => {
          identifiers.push(node.name)
        },
      })
    }

    return identifiers
  }

  /**
   * Get a list of all nodes in the AST in the order they appear in the JS code.
   *
   * @throws an error if the AST is not defined.
   */
  getNodes(): Node[] {
    const nodes: Node[] = []
    this.walk((node) => nodes.push(node))
    return nodes
  }

  /**
   * Get the object property names if the JS is an anonymous object.
   */
  getObjectProperties(): string[] {
    if (this.isObject()) {
      const object = findNodeAt(
        this._ast!,
        this._prefix.length,
        this._prefix.length + this._rawJS.length,
      )!.node as any
      return object.properties.map((property: any) => property.key.name).sort()
    }

    return []
  }

  /**
   * Return the raw JS content without the pseudo declarator.
   */
  getRawJS(): string {
    return this._rawJS
  }

  /**
   * Check if the JS code is a valid expression that can be used in `if` attributes.
   * These expressions can be safely evaluated.
   */
  isIfAttributeValue(): boolean {
    if (!this._ast) {
      return false
    }

    for (const node of this.getNodes()) {
      if (['CallExpression', 'VariableDeclaration'].includes(node.type)) {
        return false
      }
    }

    return true
  }

  /**
   * Check if the JS code is an object.
   */
  isObject(): boolean {
    if (this._ast) {
      return (
        findNodeAt(this._ast, this._prefix.length, this._prefix.length + this._rawJS.length)?.node
          .type === 'ObjectExpression'
      )
    }

    return false
  }

  /**
   * Parse an `x-for` expression.
   *
   * @author VueJS 2.* core
   */
  static parseForExpression(
    expression: string,
  ): { item: string; index: string; items: string; collection: string } | null {
    const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
    const stripParensRE = /^\s*\(|\)\s*$/g
    const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
    const inMatch = expression.match(forAliasRE)

    if (!inMatch) {
      return null
    }

    const result: { item: string; index: string; items: string; collection: string } = {
      item: '',
      index: '',
      items: '',
      collection: '',
    }
    const item = inMatch[1].replace(stripParensRE, '').trim()
    const iteratorMatch = item.match(forIteratorRE)

    result.items = inMatch[2].trim()

    if (iteratorMatch) {
      result.item = item.replace(forIteratorRE, '').trim()
      result.index = iteratorMatch[1].trim()

      if (iteratorMatch[2]) {
        result.collection = iteratorMatch[2].trim()
      }
    } else {
      result.item = item
    }

    return result
  }

  /**
   * Helper method for throwing an error when the AST is not defined.
   *
   * @throws an error.
   */
  protected _throw(): never {
    throw new Error('The abstract syntax tree is not defined.')
  }

  /**
   * Walks through all nodes in the AST and invoke a `callback` for each node found.
   *
   * @throws an error if the AST is not defined.
   */
  walk(callback: (node: Node, type: string) => void): void {
    if (this._ast) {
      full(this._ast, (node, _, type) => callback(node, type))
    } else {
      this._throw()
    }
  }

  /**
   * Walks through all nodes in the AST using the `simple` acorn-walk function.
   *
   * @see {@link https://github.com/acornjs/acorn/tree/master/acorn-walk#readme acorn-walk} for
   * more detais.
   *
   * @throws an error if the AST is not defined.
   */
  walkSimple(visitors: SimpleVisitors<unknown>): void {
    if (this._ast) {
      simple(this._ast, visitors)
    } else {
      this._throw()
    }
  }
}
