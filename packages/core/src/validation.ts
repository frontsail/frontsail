/**
 * Check if an attribute `name` is a valid Alpine directive.
 */
export function isAlpineDirective(name: string): boolean {
  return isAttributeName(name) && /^(?:x-|:|@)/.test(name)
}

/**
 * Check if an asset `path` matches the required pattern.
 *
 * @example
 * isAssetPath('/assets/foo.svg') // true
 * isAssetPath('/foo.svg) // false
 */
export function isAssetPath(path: string): boolean {
  return /^\/assets\/[a-zA-Z0-9 \(\),\._\+\-]+(?:\/[a-zA-Z0-9 \(\),\._\+\-]+)*$/.test(path)
}

/**
 * Check if an attribute `name` matches the required pattern.
 *
 * @example
 * isAttributeName('@click') // true
 * isAttributeName('-click') // false
 */
export function isAttributeName(name: string): boolean {
  return /^[:@]?[a-z][a-z0-9]*(?:[:\.-][a-z0-9]+)*$/.test(name)
}

/**
 * Check if a component `name` matches the required pattern.
 *
 * @example
 * isComponentName('foo-bar/baz') // true
 * isComponentName('/foo-bar/baz') // false
 */
export function isComponentName(name: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(name)
}

/**
 * Check if a `text` is enclosed by a character included in the `characters` array.
 *
 * @example
 * isEnclosed('"foo"', ['"']) // true
 * isEnclosed('"foo"', ["'"]) // false
 */
export function isEnclosed(text: string, characters: string[]): boolean {
  return text.length >= 2 && text[0] === text.slice(-1) && characters.includes(text[0])
}

/**
 * Check if a global `name` matches the required pattern.
 *
 * @example
 * isGlobalName('$fooBar') // true
 * isGlobalName('$foo-bar') // false
 */
export function isGlobalName(name: string): boolean {
  return (
    ![
      '$charset',
      '$import',
      '$keyframes',
      '$layer',
      '$media',
      '$namespace',
      '$page',
      '$property',
      '$supports',
    ].includes(name) && /^\$[a-z0-9][a-zA-Z0-9]*$/.test(name)
  )
}

/**
 * Check if a page `path` matches the required pattern.
 *
 * @example
 * isPagePath('/foo-bar/baz') // true
 * isPagePath('foo-bar/baz') // false
 */
export function isPagePath(path: string): boolean {
  return /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/.test(path)
}

/**
 * Check if a property `name` matches the required pattern.
 *
 * @example
 * isPropertyName('foo_bar') // true
 * isPropertyName('FOO_BAR') // false
 */
export function isPropertyName(name: string): boolean {
  return (
    ![
      'abstract',
      'arguments',
      'await',
      'boolean',
      'break',
      'byte',
      'case',
      'catch',
      'char',
      'class',
      'const',
      'continue',
      'debugger',
      'default',
      'delete',
      'do',
      'double',
      'else',
      'enum',
      'eval',
      'export',
      'extends',
      'false',
      'final',
      'finally',
      'float',
      'for',
      'function',
      'goto',
      'if',
      'implements',
      'import',
      'in',
      'instanceof',
      'int',
      'interface',
      'into',
      'let',
      'long',
      'native',
      'new',
      'null',
      'package',
      'private',
      'protected',
      'public',
      'return',
      'short',
      'static',
      'super',
      'switch',
      'synchronized',
      'this',
      'throw',
      'throws',
      'transient',
      'true',
      'try',
      'typeof',
      'var',
      'void',
      'volatile',
      'while',
      'with',
      'yield',
    ].includes(name) && /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(name)
  )
}

/**
 * Check if a `text` is a safe slug.
 *
 * @example
 * isSafeSlug('foo-bar') // true
 * isSafeSlug('0-foo-bar') // false
 */
export function isSafeSlug(text: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(text)
}

/**
 * Check if a `text` is an `x-for` Alpine directive.
 *
 * @example
 * isXForDirectove('(color, index) in colors') // true
 * isXForDirectove('colors') // false
 */
export function isXForDirective(text: string): boolean {
  return /(?:[\s\S]*?)\s+(?:in|of)\s+(?:[\s\S]*)/.test(text)
}
