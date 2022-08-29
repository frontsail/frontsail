import { HTML, isAlpineDirective } from '@frontsail/core'
import { format as prettierFormat, Options } from 'prettier'

/**
 * Formatting options for `prettier`.
 */
const options: Options = {
  arrowParens: 'always',
  bracketSpacing: true,
  htmlWhitespaceSensitivity: 'ignore',
  printWidth: 100,
  quoteProps: 'consistent',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
}

/**
 * Format `code` with `prettier` by automatically resolving its parser from the
 * specified `filePath`.
 *
 * @throws an error if the format fails.
 */
export function format(code: string, filePath: string): string {
  const parser = resolveParser(filePath)

  if (parser === 'html') {
    return formatHTML(new HTML(code))
  } else if (parser === 'css') {
    return formatCSS(code)
  }

  return prettierFormat(code, { ...options, parser })
}

/**
 * Format CSS `code` and sort declarations based on their property names with
 * `prettier-plugin-css-order` (automatically imported by `prettier`).
 *
 * @see https://github.com/brandon-rhodes/Concentric-CSS/blob/master/style3.css
 * @throws an error if the format fails.
 */
function formatCSS(code: string): string {
  return prettierFormat(code, { ...options, parser: 'css' })
}

/**
 * Sort all attributes and format `css` and Alpine attributes, and mustaches in a
 * specified `html` instance.
 *
 * @throws an error if the format fails.
 */
function formatHTML(html: HTML): string {
  // Sort and format attributes
  for (const node of html.walk()) {
    if (HTML.adapter.isElementNode(node)) {
      for (const attr of node.attrs) {
        if (attr.name === 'css') {
          attr.value = formatCSS(attr.value).trim()
        } else if (isAlpineDirective(attr.name)) {
          attr.value = prettierFormat(attr.value, { ...options, parser: 'babel' }).trim()
        }
      }
    }
  }

  // Fix indents, format mustaches, and return
  return prettierFormat(html.toString(), { ...options, parser: 'html' })
    .replace(
      /(( *)[^\n]*?([@:a-z0-9\.-]+)="{\n)(.+?)\n(\s*}")/gs,
      (match, start: string, indent: string, name: string, between: string, end: string) => {
        if (name === 'css' || isAlpineDirective(name)) {
          return start + between.replace(/^/gm, indent) + `\n${indent}${end}`
        }

        return match
      },
    )
    .replace(/^ +$/gm, '')
    .replace(/{{\s*([$a-z0-9_]+)\s*}}/gi, '{{ $1 }}')
}

/**
 * Resolve a `prettier` by reading the file extension of a `filePath`.
 */
function resolveParser(filePath: string): Options['parser'] {
  return filePath.endsWith('.html')
    ? 'html'
    : filePath.endsWith('.js')
    ? 'babel'
    : filePath.endsWith('.css')
    ? 'css'
    : filePath.endsWith('.json')
    ? 'json'
    : undefined
}
