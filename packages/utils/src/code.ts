/**
 * Transform an offset `text` range specified with `from` and `to` to line-column pairs.
 *
 * @example
 * offsetToLineColumn('foo', 1, 3) // [1, 1], [1, 3]
 */
export function offsetToLineColumn(
  text: string,
  from: number,
  to?: number,
): { start: [line: number, column: number]; end: [line: number, column: number] } {
  const rows = text.split('\n')
  const start: [line: number, column: number] = [-1, -1]
  const end: [line: number, column: number] = [-1, -1]

  if (to === undefined) {
    to = from
  }

  let prevCharacters: number = 0

  for (const [index, row] of rows.entries()) {
    if (start[0] === -1 && from <= prevCharacters + row.length) {
      start[0] = index + 1
      start[1] = Math.min(from - prevCharacters + 1, row.length)
    }

    if (end[0] === -1 && to <= prevCharacters + row.length) {
      end[0] = index + 1
      end[1] = Math.max(to - prevCharacters, 1)
    }

    if (start[0] + end[0] > 1) {
      break
    }

    prevCharacters += row.length + 1
  }

  if (start[0] === -1) {
    start[0] = rows.length
    start[1] = Math.max(rows[start[0] - 1].length, 1)
    end[0] = start[0]
    end[1] = start[1]
  }

  if (end[0] === -1) {
    end[0] = rows.length
    end[1] = Math.max(rows[end[0] - 1].length, 1)
  }

  if (start[0] === end[0] && end[1] < start[1]) {
    end[1] = start[1]
  }

  return { start, end }
}

/**
 * Transform a `text` range with line-column pairs specified with `start` and `end`
 * to an offset range.
 *
 * @example
 * lineColumnToOffset('foo', [1, 1], [1, 3]) // { from: 1, to: 3 }
 */
export function lineColumnToOffset(
  text: string,
  start: [line: number, column: number],
  end?: [line: number, column: number],
): { from: number; to: number } {
  const rows = text.split('\n')

  let from: number = 0
  let to: number = 0

  if (!end) {
    end = start
  }

  const startRow = rows[start[0] - 1]
  const endRow = rows[end[0] - 1]

  if (startRow === undefined) {
    from = text.length
  } else {
    let prev: number = start[0] - 1

    for (let i = 0; i < start[0] - 1; i++) {
      prev += rows[i]?.length ?? 0
    }

    from = Math.min(start[1] - 1, startRow.length) + prev
  }

  if (endRow === undefined) {
    to = text.length
  } else {
    let prev: number = end[0] - 1

    for (let i = 0; i < end[0] - 1; i++) {
      prev += rows[i]?.length ?? 0
    }

    to = Math.max(Math.min(end[1] - 1, endRow.length) + prev, from)
  }

  return { from, to }
}
