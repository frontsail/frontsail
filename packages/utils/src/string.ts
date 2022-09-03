/**
 * Convert a `text` to camelCase.
 *
 * @example
 * camelize('Foo Bar') // 'fooBar'
 */
export function camelize(text: string): string {
  return slugify(text).replace(/-./g, (match) => match[1].toUpperCase())
}

/**
 * Convert `html` special characters to their entity equivalents.
 *
 * @example
 * escape('<div></div>') // '&lt;div&gt;&lt;/div&gt;'
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
 * @example
 * hash('foo') // 101574
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
 * Convert a `text` to a SEO friendly string.
 *
 * @example
 * slugify('SEO Friendly String!') // 'seo-friendly-string'
 * slugify('123 foo bar', '_', true) // 'foo_bar'
 */
export function slugify(text: string, separator: string = '-', safe: boolean = false): string {
  text = text.toString().toLowerCase().trim()

  // Safe slug
  if (safe) {
    text = text.replace(/^\s*[0-9]+/, '')
  }

  // Add localization support
  const sets = [
    { to: 'a', from: '[ÀÁÂÃÅÆĀĂĄẠẢẤẦẨẪẬẮẰẲẴẶ]' },
    { to: 'ae', from: '[Ä]' },
    { to: 'c', from: '[ÇĆĈČ]' },
    { to: 'd', from: '[ÐĎĐÞ]' },
    { to: 'e', from: '[ÈÉÊËĒĔĖĘĚẸẺẼẾỀỂỄỆ]' },
    { to: 'g', from: '[ĜĞĢǴ]' },
    { to: 'h', from: '[ĤḦ]' },
    { to: 'i', from: '[ÌÍÎÏĨĪĮİỈỊ]' },
    { to: 'j', from: '[Ĵ]' },
    { to: 'ij', from: '[Ĳ]' },
    { to: 'k', from: '[Ķ]' },
    { to: 'l', from: '[ĹĻĽŁ]' },
    { to: 'm', from: '[Ḿ]' },
    { to: 'n', from: '[ÑŃŅŇ]' },
    { to: 'o', from: '[ÒÓÔÕØŌŎŐỌỎỐỒỔỖỘỚỜỞỠỢǪǬƠ]' },
    { to: 'oe', from: '[ŒÖ]' },
    { to: 'p', from: '[ṕ]' },
    { to: 'r', from: '[ŔŖŘ]' },
    { to: 's', from: '[ŚŜŞŠ]' },
    { to: 'ss', from: '[ß]' },
    { to: 't', from: '[ŢŤ]' },
    { to: 'u', from: '[ÙÚÛŨŪŬŮŰŲỤỦỨỪỬỮỰƯ]' },
    { to: 'ue', from: '[Ü]' },
    { to: 'w', from: '[ẂŴẀẄ]' },
    { to: 'x', from: '[ẍ]' },
    { to: 'y', from: '[ÝŶŸỲỴỶỸ]' },
    { to: 'z', from: '[ŹŻŽ]' },
    { to: '-', from: "[·/_,:;']" },
  ]

  sets.forEach((set) => {
    text = text.replace(new RegExp(set.from, 'gi'), set.to)
  })

  text = text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text

  // Replace separator if not standard
  if (separator !== '-') {
    text = text.replace(/-/g, separator)
  }

  return text
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
