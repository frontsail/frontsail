import { Project } from './Project'
import { Template } from './Template'
import { isPagePath } from './validation'

/**
 * @todo
 */
export class Page extends Template {
  /**
   * Validate the page `path` and instantiate.
   *
   * @throws an error if the component name is not valid.
   */
  constructor(path: string, html: string, project?: Project) {
    if (!isPagePath(path)) {
      throw new Error(`The page path '${path}' is not valid.`)
    }

    super(path, html, project)
  }

  // @todo Alpine directives cannot be used outside of `<include>` tags.
}
