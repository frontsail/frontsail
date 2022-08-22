import { nanoid } from 'nanoid/non-secure'
import CssSyntaxError from './css-syntax-error'

let fromOffsetCache = Symbol('fromOffsetCache')

export default class Input {
  constructor(css) {
    if (css === null || typeof css === 'undefined' || (typeof css === 'object' && !css.toString)) {
      throw new Error(`PostCSS received ${css} instead of CSS string`)
    }

    this.css = css.toString()

    if (this.css[0] === '\uFEFF' || this.css[0] === '\uFFFE') {
      this.hasBOM = true
      this.css = this.css.slice(1)
    } else {
      this.hasBOM = false
    }

    this.id = '<input css ' + nanoid(6) + '>'
  }

  fromOffset(offset) {
    let lastLine, lineToIndex
    if (!this[fromOffsetCache]) {
      let lines = this.css.split('\n')
      lineToIndex = new Array(lines.length)
      let prevIndex = 0

      for (let i = 0, l = lines.length; i < l; i++) {
        lineToIndex[i] = prevIndex
        prevIndex += lines[i].length + 1
      }

      this[fromOffsetCache] = lineToIndex
    } else {
      lineToIndex = this[fromOffsetCache]
    }
    lastLine = lineToIndex[lineToIndex.length - 1]

    let min = 0
    if (offset >= lastLine) {
      min = lineToIndex.length - 1
    } else {
      let max = lineToIndex.length - 2
      let mid
      while (min < max) {
        mid = min + ((max - min) >> 1)
        if (offset < lineToIndex[mid]) {
          max = mid - 1
        } else if (offset >= lineToIndex[mid + 1]) {
          min = mid + 1
        } else {
          min = mid
          break
        }
      }
    }
    return {
      line: min + 1,
      col: offset - lineToIndex[min] + 1,
    }
  }

  error(message, line, column) {
    let result, endLine, endColumn

    if (line && typeof line === 'object') {
      let start = line
      let end = column
      if (typeof line.offset === 'number') {
        let pos = this.fromOffset(start.offset)
        line = pos.line
        column = pos.col
      } else {
        line = start.line
        column = start.column
      }
      if (typeof end.offset === 'number') {
        let pos = this.fromOffset(end.offset)
        endLine = pos.line
        endColumn = pos.col
      } else {
        endLine = end.line
        endColumn = end.column
      }
    } else if (!column) {
      let pos = this.fromOffset(line)
      line = pos.line
      column = pos.col
    }

    result = new CssSyntaxError(
      message,
      endLine === undefined ? line : { line, column },
      endLine === undefined ? column : { line: endLine, column: endColumn },
      this.css,
    )

    result.input = { line, column, endLine, endColumn, source: this.css }

    return result
  }

  toJSON() {
    let json = {}
    for (let name of ['hasBOM', 'css', 'id']) {
      if (this[name] != null) {
        json[name] = this[name]
      }
    }
    return json
  }
}
