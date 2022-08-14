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
  constructor(path: string, html: string) {
    if (!isPagePath(path)) {
      throw new Error(`The page path '${path}' is not valid.`)
    }

    super(path, html)
  }
}
