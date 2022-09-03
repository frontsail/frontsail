import { lineColumnToOffset } from '@frontsail/utils'
import jsonToAST from 'json-to-ast'
import { Diagnostics } from './Diagnostics'
import { JSONDiagnostics } from './types/json'

/**
 * Parses and transforms a JSON string into an abstract syntax tree using
 * [json-to-ast](https://github.com/vtrushin/json-to-ast).
 *
 * The class provides functionalities that meet the needs of FrontSail projects.
 * It is not a full-featured CSS manipulation tool.
 *
 * @see {@link https://github.com/vtrushin/json-to-ast json-to-ast repository} for
 * more details on the AST.
 *
 * ---
 *
 * Glossary:
 *
 * - **AST** - Refers to the CSS abstract sytax tree built with postcss.
 *
 * - **Global** - Refers to a globally accessible string variable that can be
 *   interpolated across templates and used in CSS in declaration values and media
 *   queries. Global names starts with a dollar sign (`$`) followed by a camel string
 *   (e.g. '$copyright', '$primaryColor', '$2xs', etc.).
 *
 * - **Inline CSS** - Refers to a CSS rule written in a custom `css` attribute,
 *   without a selector, which can have SCSS-like syntax. It should not be confused
 *   with inline styles.
 *
 * - **json-to-ast** - A JSON AST parser.
 *
 * - **postcss** - A tool for transforming and modifying CSS rules.
 */
export class JSON extends Diagnostics<JSONDiagnostics> {
  /**
   * Raw JSON string that is transformed to an AST.
   */
  protected _json: string

  /**
   * The abstract syntax tree created from the input JSON.
   */
  protected _ast?: jsonToAST.ValueNode

  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: JSONDiagnostics = {
    syntax: [],
  }

  /**
   * Instantiate with an abstract syntax tree.
   *
   * @param json The JSON string.
   */
  constructor(json: string) {
    super()

    this._json = json

    try {
      this._ast = jsonToAST(this._json)
    } catch (e) {
      const { from, to } = lineColumnToOffset(this._json, [e.line, e.column])
      const message =
        e.message
          .replace(/^(.+?) at [0-9]+:[0-9]+/, '$1')
          .split('\n')
          .shift() + '.'

      this.addDiagnostics('syntax', {
        message: this._json.trim() ? message : 'Missing value.',
        severity: 'error',
        from,
        to,
      })
    }
  }

  /**
   * Get a list of all nodes in the AST in the order they appear in the JSON.
   *
   * @throws an error if the AST is not defined.
   */
  getNodes(): jsonToAST.ASTNode[] {
    return [...this.walk()]
  }

  /**
   * Get a list of all property nodes in an object AST in the order they appear
   * in the JSON.
   *
   * @throws an error if the AST is not an object or it's not defined.
   */
  getPropertyNodes(): jsonToAST.PropertyNode[] {
    if (!this._ast) {
      throw new Error('The abstract syntax tree is not defined.')
    } else if (this._ast.type !== 'Object') {
      throw new Error('Object expected.')
    }

    return this._ast.children
  }

  /**
   * Walks through all nodes in the AST.
   *
   * @throws an error if the AST is not defined.
   */
  *walk(): Generator<jsonToAST.ASTNode, void, unknown> {
    function* iterator(node: jsonToAST.ASTNode) {
      yield node

      if (node.type === 'Object' || node.type === 'Array') {
        const childNodes = (node as jsonToAST.ObjectNode | jsonToAST.ArrayNode).children

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
