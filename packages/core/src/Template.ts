import { HTML } from './HTML'

/**
 * @todo
 *
 * ---
 *
 * Glossary:
 *
 * - **AST** - Refers to an HTML abstract sytax tree.
 *
 * - **Safe slug** - A string that matches the pattern `/^[a-z]+(?:-[a-z0-9]+)*$/`.
 *   Note that this particular slug must start with a letter.
 */
export class Template {
  /**
   * A component name (e.g. 'ui/text-input') or a page path (e.g. '/contact').
   * The IDs must contain slugs that can be separated by forward slashes (`/`).
   * Component IDs always start with a safe slug and page IDs with a forward slash.
   */
  protected _id: string

  /**
   * An HTML class object instantiated from the template content.
   *
   * @see HTML for more details.
   */
  protected _html: HTML

  /**
   * Instantiate with an abstract syntax tree.
   */
  constructor(id: string, html: string) {
    this._id = id
    this._html = new HTML(html)
  }
}
