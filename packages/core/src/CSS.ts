import { AtRule, Declaration, parse, Root, Rule } from '@frontsail/postcss'
import { last, lineColumnToOffset } from '@frontsail/utils'
import { Diagnostics } from './Diagnostics'
import { CSSDiagnostics, Modifier } from './types/css'
import { GlobalVariable } from './types/project'
import { isGlobalName } from './validation'

/**
 * Parses and transforms inline CSS code into an abstract syntax tree using
 * [postcss](https://github.com/postcss/postcss).
 *
 * The class provides functionalities that meet the needs of FrontSail projects.
 * It is not a full-featured CSS manipulation tool.
 *
 * @see {@link https://github.com/postcss/postcss postcss repository} for
 * more details on the AST.
 *
 * ---
 *
 * Glossary:
 *
 * - **AST** - Refers to the CSS abstract sytax tree built with postcss.
 *
 * - **Attribute** - An HTML attribute (e.g. `<div css="{ display: block }"></div>`).
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
 * - **postcss** - A tool for transforming and modifying CSS rules.
 *
 * - **Safe camel** - A camel case string that matches the pattern `/^[a-z][a-zA-Z0-9]*$/`.
 *   Note that this particular slug must start with a letter.
 */
export class CSS extends Diagnostics<CSSDiagnostics> {
  /**
   * Raw inline CSS content that is transformed to an AST.
   */
  protected _css: string

  /**
   * The abstract syntax tree created from the input CSS.
   */
  protected _ast?: Root

  /**
   * Collection of diagnostics organized by types.
   */
  protected _diagnostics: CSSDiagnostics = {
    logical: [],
    syntax: [],
  }

  /**
   * Instantiate with an abstract syntax tree.
   *
   * @param css The CSS code.
   */
  constructor(css: string) {
    super()

    this._css = css

    try {
      this._ast = parse(this._css)
    } catch (e) {
      const { from, to } = lineColumnToOffset(
        this._css,
        [e.line, e.column],
        [e.endLine, e.endColumn],
      )

      this.addDiagnostics('syntax', {
        message: e.message.replace(/^<css input>:[0-9]+:[0-9]+: /, '') + '.',
        severity: 'error',
        from,
        to,
      })
    }
  }

  /**
   * Resolve SCSS-like syntax from the AST and return the built CSS code.
   *
   * @param sortMediaQueries List of global variables for sorting media queries.
   * @param minify Whether to minify the build output.
   */
  build(sortMediaQueries: string[] = [], minify: boolean = false): string {
    if (!this.hasProblems('syntax')) {
      const ast = new Root()

      CSS.getAnyRules(this._ast!).forEach((rule) => ast.append(this._builder(rule)))
      CSS.sortAndMergeMediaQueries(ast, sortMediaQueries)

      if (minify) {
        ast.walk((node) => {
          node.raws.after = ''
          node.raws.before = ''
          node.raws.between = node.type === 'decl' ? ':' : ''
        })
      } else {
        ast.cleanRaws()
      }

      return ast.toString()
    }

    return ''
  }

  /**
   * Build rules from from `anyRule` by resolving their selectors, nesting, at-rules,
   * and declarations.
   */
  protected _builder(
    anyRule: Rule | AtRule,
    _parentRules: Rule[] = [],
    _parentAtRules: AtRule[] = [],
  ): (Rule | AtRule)[] {
    const output: (Rule | AtRule)[] = []

    if (anyRule.type === 'rule') {
      // Clone rule and resolve selectors
      const clone = CSS.cloneAndResolveSelector(anyRule, last(_parentRules)?.selectors ?? [])

      // Copy declarations from original rules to our clone
      clone.append(CSS.getDeclarations(anyRule).map((declaration) => declaration.clone()))

      if (clone.nodes.length > 0) {
        output.push(clone)
      }

      CSS.getAnyRules(anyRule).forEach((childRule) => {
        output.push(...this._builder(childRule, [..._parentRules, clone], _parentAtRules))
      })
    } else {
      const clone = isGlobalName(`$${anyRule.name}`)
        ? anyRule.clone({
            name: 'media',
            params: `$${anyRule.name}`,
            nodes: [],
            raws: { between: ' ' },
          })
        : anyRule.clone({ nodes: [] })

      // At-rule is nested in a rule
      if (last(_parentRules)) {
        const declarations = CSS.getDeclarations(anyRule)

        if (declarations.length > 0) {
          clone.append(last(_parentRules).clone({ nodes: [] }).append(declarations))
        }
      }

      // At-rule is top level
      if (_parentAtRules.length === 0) {
        output.push(clone)
      }
      // There are parent at-rules
      else {
        last(_parentAtRules).append(clone)
      }

      CSS.getAnyRules(anyRule).forEach((childRule) => {
        clone.append(this._builder(childRule, _parentRules, [..._parentAtRules, clone]))
      })
    }

    return output
  }

  /**
   * Clone a `rule` and resolve its selectors by applying `parentSelectors` to them.
   */
  static cloneAndResolveSelector(rule: Rule, parentSelectors: string[] = []): Rule {
    const selectors = rule.selectors
      .map((selector) => {
        if (parentSelectors.length > 0) {
          return parentSelectors.map((parentSelector) => {
            if (selector.includes('&')) {
              return selector.replace(/&/g, parentSelector)
            } else if (/%[a-z][a-zA-Z0-9]*/.test(selector)) {
              return selector
            }

            return `${parentSelector} ${selector}`
          })
        }

        return selector
      })
      .flat()

    return rule.clone({ selectors, nodes: [] })
  }

  /**
   * Extract and return child rules and at-rules from a `node`.
   */
  static getAnyRules(node: Root | Rule | AtRule): (Rule | AtRule)[] {
    return node.nodes.filter((childNode) => ['rule', 'atrule'].includes(childNode.type)) as (
      | Rule
      | AtRule
    )[]
  }

  /**
   * Extract and return child at-rules from a `node`.
   */
  static getAtRules(node: Root | Rule | AtRule): AtRule[] {
    return node.nodes.filter((childNode) => childNode.type === 'atrule') as AtRule[]
  }

  /**
   * Get the first found parent rule from a specified `node`.
   */
  static getClosestParentRule(node: Rule | AtRule): Rule | null {
    let parent = node.parent

    while (parent && parent.type !== 'rule') {
      parent = parent.parent
    }

    return (parent as Rule) ?? null
  }

  /**
   * Extract and return declaration nodes from a `rule`.
   */
  static getDeclarations(rule: Rule | AtRule): Declaration[] {
    return rule.nodes.filter((node) => node.type === 'decl') as Declaration[]
  }

  /**
   * Get a list of all class name modifiers in the CSS code.
   */
  static getModifiers(css: string): Modifier[] {
    const regex = /%([a-z][a-zA-Z0-9]*)/g
    const modifiers: Modifier[] = []
    let match: RegExpExecArray | null

    do {
      match = regex.exec(css)

      if (match) {
        modifiers.push({
          text: match[0],
          name: match[1],
          from: match.index,
          to: match.index + match[0].length,
        })
      }
    } while (match)

    return modifiers
  }

  /**
   * Get a list of all global variables in the CSS code.
   */
  static getGlobals(css: string): GlobalVariable[] {
    const regex = /(?:\$|@)([a-z][a-zA-Z0-9]*)/g
    const variables: GlobalVariable[] = []
    let match: RegExpExecArray | null

    do {
      match = regex.exec(css)

      if (match && isGlobalName(`$${match[1]}`)) {
        variables.push({
          text: match[0],
          variable: `$${match[1]}`,
          from: match.index,
          to: match.index + match[0].length,
        })
      }
    } while (match)

    return variables
  }

  /**
   * Get a list of all global variables in the CSS code.
   *
   * @alias CSS.getGlobals
   */
  getGlobals(): GlobalVariable[] {
    return CSS.getGlobals(this._css)
  }

  /**
   * Get a list of all class name modifiers in the CSS code.
   *
   * @alias CSS.getModifiers
   */
  getModifiers(): Modifier[] {
    return CSS.getModifiers(this._css)
  }

  /**
   * Extract and return child rules from a `node`.
   */
  static getRules(node: Root | Rule | AtRule): Rule[] {
    return node.nodes.filter((childNode) => childNode.type === 'rule') as Rule[]
  }

  /**
   * Check if a `rule` has any declaration nodes.
   */
  static hasDeclarations(rule: Rule | AtRule): boolean {
    return rule.nodes.some((node) => node.type === 'decl')
  }

  /**
   * Extract and return declaration nodes from a `rule` recursively.
   */
  static hasDeclarationsDeep(rule: Rule | AtRule): boolean {
    let result: boolean = false

    rule.walkDecls((declaration) => {
      result = true
    })

    return result
  }

  /**
   * Check if a `rule` is nested in an at-rule.
   */
  static hasParentAtRule(rule: Rule | AtRule): boolean {
    let parent = rule.parent

    while (parent) {
      if (parent.type === 'atrule') {
        return true
      }

      parent = parent.parent
    }

    return false
  }

  /**
   * Check if a `rule` is nested in another rule.
   */
  static hasParentRule(rule: Rule | AtRule): boolean {
    let parent = rule.parent

    while (parent) {
      if (parent.type === 'rule') {
        return true
      }

      parent = parent.parent
    }

    return false
  }

  /**
   * Analyze all nodes in the AST and run logical tests. Diagnostics can be retrieved
   * with the method `getDiagnostics()`.
   */
  lint(): this {
    if (!this.hasProblems('syntax')) {
      this.clearDiagnostics('logical')

      this._ast!.walkRules((rule) => {
        const regex = /%\w*/g
        let match: RegExpExecArray | null

        do {
          match = regex.exec(rule.selector)

          if (match && !/^%[a-z][a-zA-Z0-9]*$/.test(match[0])) {
            this.addDiagnostics('logical', {
              message: 'Invalid modifier format.',
              severity: 'warning',
              from: rule.source!.start!.offset + match.index,
              to: rule.source!.start!.offset + match.index + match[0].length,
            })
          }
        } while (match)
      })

      this._ast!.walkAtRules((atRule) => {
        if (CSS.hasDeclarations(atRule) && !CSS.hasParentRule(atRule)) {
          CSS.getDeclarations(atRule).forEach((declaration) => {
            this.addDiagnostics('logical', {
              message: 'Missing parent rule.',
              severity: 'warning',
              from: declaration.source!.start!.offset,
              to: declaration.source!.end!.offset + 1,
            })
          })
        }
      })
    }

    return this
  }

  /**
   * Sort and merge media queries with variables (e.g. '@media $sm') in a given `order`.
   * Normal media queries are only merged during the process.
   *
   * @param ast The abstract syntax tree to sort.
   * @param order List of ordered global variable names.
   */
  static sortAndMergeMediaQueries(ast: Root, order: string[]): Root {
    const newAtRules: AtRule[] = []

    CSS.getAtRules(ast).forEach((atRule) => {
      if (
        !newAtRules.some(
          (_newAtRule) => _newAtRule.name === atRule.name && _newAtRule.params === atRule.params,
        )
      ) {
        newAtRules.push(atRule.clone({ nodes: [] }))
      }

      const newAtRule = newAtRules.find(
        (_newAtRule) => _newAtRule.name === atRule.name && _newAtRule.params === atRule.params,
      )!

      newAtRule.append(atRule.nodes)
      atRule.remove()
    })

    newAtRules.sort((a, b) => order.indexOf(a.params) - order.indexOf(b.params))

    return ast.append(newAtRules)
  }
}
