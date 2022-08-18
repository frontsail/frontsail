import { Project } from './Project'
import { Template } from './Template'
import { isComponentName } from './validation'

/**
 * @todo
 *
 * ---
 *
 * Glossary:
 *
 * @todo
 */
export class Component extends Template {
  /**
   * Validate the component `name` and instantiate.
   *
   * @param name A unique component name.
   * @param html The HTML code to parse.
   * @param project A `Project` instance used for linting dependencies.
   * @throws an error if the component name is not valid.
   */
  constructor(name: string, html: string, project?: Project) {
    if (!isComponentName(name)) {
      throw new Error(`The component name '${name}' is not valid.`)
    }

    super(name, html, project)
  }

  // @todo Components must have one root element (must be a div, p, h, span, header, footer, etc. tag).
}
