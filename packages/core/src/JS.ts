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
 * - **AST** - Refers to the JavaScript abstract sytax tree built with Acorn.
 *
 * - **Acorn** - A small, fast, JavaScript-based JavaScript parser.
 *
 * - **Attribute** - An HTML attribute (e.g. `<div if="foo"></div>`).
 */
export class JS extends Diagnostics<JSDiagnostics> {
  /**
   * Raw JavaScript content that is transformed to an AST.
   */
  protected _js: string

  /**
   * A declaration prefix used for invalid JS inputs like anonymous objects in Alpine
   * directives (e.g. `{ foo: 'bar' }`).
   */
  protected _declarator: string

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
   * @param declarator Whether to prefix the `js` code with a pseudo declarator.
   */
  constructor(js: string, declarator: boolean = false) {
    super()

    this._declarator = declarator ? 'const $ = ' : ''
    this._js = this._declarator + js

    try {
      this._ast = parse(this._js, { ecmaVersion: 2020 })
    } catch (e) {
      this.addDiagnostics('syntax', {
        message: e.message.replace(/ \([0-9]+:[0-9]+\)$/, '.'),
        severity: 'error',
        from: e.pos - this._declarator.length,
        to: e.pos - this._declarator.length,
      })
    }
  }

  /**
   * Add the `this` keyword to identifiers included in `targets` and return the
   * transformed JavaScript code.
   */
  addThis(targets: string[]): string {
    let js = this.getRawJS()
    let diff: number = 0

    if (this._ast) {
      this.walkSimple({
        Identifier: (node: Node & { name: string }) => {
          if (targets.includes(node.name)) {
            const from = node.start - this._declarator.length + diff
            const to = node.end - this._declarator.length + diff
            js = js.slice(0, from) + `this.${node.name}` + js.slice(to)
            diff += 5 // 'this.'.length
          }
        },
      })
    }

    return js
  }

  /**
   * Create a new instance of this class instance using its raw JS contents.
   * Diagnostics are not cloned.
   */
  clone(): JS {
    return new JS(this._js)
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
        message: e.toString(),
        severity: 'error',
        from: 0,
        to: this._js.length - this._declarator.length,
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
      const object = findNodeAt(this._ast!, this._declarator.length, this._js.length)!.node as any
      return object.properties.map((property) => property.key.name).sort()
    }

    return []
  }

  /**
   * Return the raw JS content without the pseudo declarator.
   */
  getRawJS(): string {
    return this._js.replace(this._declarator, '')
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
        findNodeAt(this._ast, this._declarator.length, this._js.length)?.node.type ===
        'ObjectExpression'
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
