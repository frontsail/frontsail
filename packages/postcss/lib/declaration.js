import Node from './node'

export default class Declaration extends Node {
  constructor(defaults) {
    if (defaults && typeof defaults.value !== 'undefined' && typeof defaults.value !== 'string') {
      defaults = { ...defaults, value: String(defaults.value) }
    }
    super(defaults)
    this.type = 'decl'
  }

  get variable() {
    return this.prop.startsWith('--') || this.prop[0] === '$'
  }
}
