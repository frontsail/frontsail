import { Template } from './Template'
import { isComponentName } from './validation'

/**
 * @todo
 */
export class Component extends Template {
  /**
   * Validate the component `name` and instantiate.
   *
   * @throws an error if the component name is not valid.
   */
  constructor(name: string, html: string) {
    if (!isComponentName(name)) {
      throw new Error(`The component name '${name}' is not valid.`)
    }

    super(name, html)
  }
}
