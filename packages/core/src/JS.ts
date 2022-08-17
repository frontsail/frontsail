import { uniqueArray } from '@frontsail/utils'
import { Node, parse } from 'acorn'
import { full, simple, SimpleVisitors } from 'acorn-walk'
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
   */
  constructor(js: string) {
    super()

    this._js = js

    try {
      this._ast = parse(js, { ecmaVersion: 2020 })
    } catch (e) {
      this.addDiagnostics('syntax', {
        message: e.message,
        severity: 'error',
        from: 0,
        to: js.length,
      })
    }
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
        to: this._js.length,
      })
    }
  }

  /**
   * Find and return a list of identifiers in the AST.
   */
  getIdentifiers(): string[] {
    const variables: string[] = []

    this.walkSimple({
      Identifier(node: Node & { name: string }) {
        variables.push(node.name)
      },
    })

    return variables
  }

  /**
   * Get a list of all nodes in the AST in the order they appear in the JS code.
   */
  getNodes(): Node[] {
    const nodes: Node[] = []
    this.walk((node) => nodes.push(node))
    return nodes
  }

  /**
   * Check if the JS code is a valid expression that can be used in `if` attributes.
   * These expressions can be safely evaluated.
   */
  isIfAttributeValue(): boolean {
    for (const node of this.getNodes()) {
      if (['CallExpression', 'VariableDeclaration'].includes(node.type)) {
        return false
      }
    }

    return true
  }

  /**
   * Walks through all nodes in the AST and invoke a `callback` for each node found.
   *
   * @throws an error if the AST is not defined.
   */
  walk(callback: (node: Node, type: string) => void) {
    if (this._ast) {
      full(this._ast, (node, _, type) => callback(node, type))
    } else {
      throw new Error('The abstract syntax tree is not defined.')
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
  walkSimple(visitors: SimpleVisitors<unknown>) {
    if (this._ast) {
      simple(this._ast, visitors)
    } else {
      throw new Error('The abstract syntax tree is not defined.')
    }
  }
}
