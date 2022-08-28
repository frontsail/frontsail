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
 * Create a hash code from a string.
 *
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
export function hash(text: string): number {
  let hash: number = 0

  if (text.length === 0) {
    return 0
  }

  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }

  return hash
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
