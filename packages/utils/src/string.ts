/**
 * Convert `html` special characters to their entity equivalents.
 */
export function escape(html: string): string {
  return html.replace(
    /[<>'"]/g,
    (tag) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      }[tag] || tag),
  )
}

/**
 * Split a `text` with a specified `delimiter` into chunks with offset ranges.
 *
 * @example
 * split('a|b', '|') // [{ value: 'a', from: 0, to: 1 }, { value: 'b', from: 2, to: 3 }]
 */
export function split(
  text: string,
  delimiter: string = ',',
): { value: string; from: number; to: number }[] {
  let index = 0

  return text.split(delimiter).map((value) => {
    const from = index
    const to = index + value.length
    index = to + delimiter.length
    return { value, from, to }
  })
}
