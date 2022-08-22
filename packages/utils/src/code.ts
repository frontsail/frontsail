/**
 * Transform a `text` range with line-column pairs specified with `start` and `end`
 * to an offset range.
 *
 * @example
 * lineColumnToRange('foo', [1, 1], [1, 3]) // { from: 1, to: 3 }
 */
export function lineColumnToRange(
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
    let prev: number = 0

    for (let i = 0; i < start[0] - 1; i++) {
      prev += rows[i]?.length ?? 0
    }

    from = Math.min(start[1], startRow.length) + prev
  }

  if (endRow === undefined) {
    to = text.length
  } else {
    let prev: number = 0

    for (let i = 0; i < end[0] - 1; i++) {
      prev += rows[i]?.length ?? 0
    }

    to = Math.max(Math.min(end[1], endRow.length) + prev, from)
  }

  return { from, to }
}
