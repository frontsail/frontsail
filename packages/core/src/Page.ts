import { HTML } from './HTML'
import { Project } from './Project'
import { Template } from './Template'
import { AtLeastOne } from './types/generic'
import { PageDiagnostics } from './types/page'
import { isAlpineDirective, isPagePath } from './validation'

/**
 * @todo
 *
 * ---
 *
 * Glossary:
 *
 * - **AST** - Refers to an HTML abstract sytax tree.
 *
 * - **Attribute** - An HTML attribute (e.g. `<div attribute-name="value"></div>`).
 *
 * - **Include** - Refers to using the special `<include>` tag to render asset file
 *   contents or components.
 */
export class Page extends Template {
  /**
   * Validate the page `path` and instantiate.
   *
   * @param path A unique page path.
   * @param html The HTML code to parse.
   * @param project A `Project` instance used for linting dependencies.
   * @throws an error if the component name is not valid.
   */
  constructor(path: string, html: string, project?: Project) {
    if (!isPagePath(path)) {
      throw new Error(`The page path '${path}' is not valid.`)
    }

    super(path, html, project)
  }

  /**
   * Analyze all nodes in the AST and run the specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getDiagnostics()`.
   */
  lint(...tests: AtLeastOne<PageDiagnostics>): this {
    super.lint(...tests)

    if (this.shouldTest('alpineDirectives', tests)) {
      for (const node of this._html.walk()) {
        if (HTML.adapter.isElementNode(node)) {
          //
          // Check Alpine directives
          //
          for (const attr of node.attrs) {
            if (isAlpineDirective(attr.name) && !HTML.hasParent(node, 'include')) {
              this.addDiagnostics('alpineDirectives', {
                message: "Alpine directives in pages cannot be used outside of 'include' elements.",
                severity: 'error',
                ...this._html.getAttributeNameRange(node, attr.name)!,
              })
            }
          }
        }
      }
    }

    return this
  }
}
