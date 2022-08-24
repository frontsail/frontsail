import { HTML } from './HTML'
import { Project } from './Project'
import { Template } from './Template'
import { AtLeastOne } from './types/generic'
import { TemplateDiagnostics } from './types/template'
import { isAlpineDirective, isPagePath } from './validation'

/**
 * Handles page specific linting.
 *
 * @see Template for everything else.
 *
 * ---
 *
 * Glossary:
 *
 * - **Alpine** - A lightweight JavaScript framework ([link](https://alpinejs.dev/)).
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
export class Page extends Template {
  /**
   * Template type.
   */
  protected _type: 'component' | 'page' = 'page'

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
   * Create a new instance of this class instance using its id and raw HTML contents.
   * Diagnostics are not cloned.
   */
  clone(): Page {
    return new Page(this._id, this._html.getRawHTML(), this._project)
  }

  /**
   * Analyze all nodes in the AST and run the specified `tests`. Use a wildcard
   * (`*`) to run all types of tests. Diagnostics can be retrieved with the method
   * `getDiagnostics()`.
   */
  lint(...tests: AtLeastOne<TemplateDiagnostics>): this {
    super.lint(...tests)

    if (this.shouldTest('alpineDirectives', tests) || this.shouldTest('outletElements', tests)) {
      for (const node of this._html.walk()) {
        if (HTML.adapter.isElementNode(node)) {
          //
          // Check Alpine directives
          //
          if (this.shouldTest('alpineDirectives', tests)) {
            for (const attr of node.attrs) {
              if (attr.name === 'x-data') {
                this.addDiagnostics('alpineDirectives', {
                  message: "The 'x-data' directive can only be used in components.",
                  severity: 'error',
                  ...this._html.getAttributeNameRange(node, attr.name)!,
                })
              } else if (isAlpineDirective(attr.name) && !HTML.hasParent(node, 'include')) {
                this.addDiagnostics('alpineDirectives', {
                  message:
                    "Alpine directives in pages cannot be used outside of 'include' elements.",
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
            this.addDiagnostics('outletElements', {
              message: 'Pages cannot have outlets.',
              severity: 'error',
              from: node.sourceCodeLocation!.startOffset,
              to: node.sourceCodeLocation!.endOffset,
            })
          }
        }
      }
    }

    return this
  }
}
