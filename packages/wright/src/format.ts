import { HTML, isAlpineDirective, isXForDirective } from '@frontsail/core'
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
 * Standard attribute order for all elements.
 */
const defaultAttributeOrder: (string | RegExp)[] = [
  'if',
  'x-data',
  'x-if',
  'x-for',
  'x-show',
  'x-ref',
  'x-bind',
  'x-model',
  'x-text',
  'x-html',
  'css',
  'class',
  'x-bind:class',
  ':class',
  'style',
  'x-bind:style',
  ':style',
  /^(?:x-bind|:)/,
  /^(?:x-on|@)/,
  /^x-/,
]

/**
 * Attribute order for `<meta>` elements.
 */
const metaAttributeOrder: (string | RegExp)[] = [...defaultAttributeOrder, 'name', '*', 'content']

/**
 * Attribute order for `<include>` elements.
 */
const includeAttributeOrder: (string | RegExp)[] = ['component', ...defaultAttributeOrder, '*']

/**
 * Attribute order for `<inject>` elements.
 */
const injectAttributeOrder: (string | RegExp)[] = ['into', ...defaultAttributeOrder, '*']

/**
 * Attribute order for `<outlet>` elements.
 */
const outletAttributeOrder: (string | RegExp)[] = ['name', ...defaultAttributeOrder, '*']

/**
 * Attribute order for `<a>`, `<area>`, `<base>`, and `<link>` elements.
 */
const hrefAttributeOrder: (string | RegExp)[] = [
  ...defaultAttributeOrder,
  'href',
  'target',
  'rel',
  '*',
]

/**
 * Attribute order for `<audio>`, `<embed>`, `<iframe>`, `<img>`, `<input>`, `<script>`,
 * `<source>`, `<track>`, and `<video>` elements.
 */
const srcAttributeOrder: (string | RegExp)[] = [...defaultAttributeOrder, 'src', 'alt', '*']

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
  const markdown: string[] = []
  let markdownIndex: number = 0

  for (const node of html.walk()) {
    if (HTML.adapter.isElementNode(node)) {
      if (node.tagName === 'markdown') {
        markdown.push(
          prettierFormat(
            html
              .getRawHTML()
              .slice(
                node.sourceCodeLocation!.startTag!.endOffset,
                node.sourceCodeLocation!.endTag!.startOffset,
              ),
            { ...options, parser: 'markdown' },
          ).trim(),
        )

        node.childNodes.splice(0, node.childNodes.length)
        HTML.adapter.insertText(node, '\n')
        HTML.adapter.appendChild(node, HTML.createElement('mdp', { id: `mdp${markdownIndex}` }))
        HTML.adapter.insertText(node, '\n')

        markdownIndex++
      }

      for (const attr of node.attrs) {
        // Sort css and Alpine attributes
        if (attr.name === 'css') {
          attr.value = formatCSS(attr.value).trim()
        } else if (isAlpineDirective(attr.name)) {
          if (isXForDirective(attr.value)) {
            const value = attr.value.replace(/^(\s*)\(([\s\S]*?)\)/, '$1[$2]')

            attr.value = prettierFormat(`for (${value}) {}`, { ...options, parser: 'babel' })
              .trim()
              .replace('for (', '')
              .replace(/\)\s*{\s*}$/, '')
              .replace(/^(\s*)\[([\s\S]*?)\]/, '$1($2)')
          } else {
            attr.value = prettierFormat(`const $ = ${attr.value}`, { ...options, parser: 'babel' })
              .replace('const $ = ', '')
              .trim()
              .replace(/^\((.+)\)$/s, '$1')
          }
        }
      }

      // Sort attributes
      if (node.tagName === 'meta') {
        sortAttributes(node.attrs, metaAttributeOrder)
      } else if (node.tagName === 'include') {
        sortAttributes(node.attrs, includeAttributeOrder)
      } else if (node.tagName === 'inject') {
        sortAttributes(node.attrs, injectAttributeOrder)
      } else if (node.tagName === 'outlet') {
        sortAttributes(node.attrs, outletAttributeOrder)
      } else if (['a', 'area', 'base', 'link'].includes(node.tagName)) {
        sortAttributes(node.attrs, hrefAttributeOrder)
      } else if (
        ['audio', 'embed', 'iframe', 'img', 'input', 'script', 'source', 'track', 'video'].includes(
          node.tagName,
        )
      ) {
        sortAttributes(node.attrs, srcAttributeOrder)
      } else {
        sortAttributes(node.attrs, [...defaultAttributeOrder, '*'])
      }
    }
  }

  // Format HTML
  let formattedHTML = prettierFormat(html.toString(), { ...options, parser: 'html' })

  // Replace md placeholders
  formattedHTML = formattedHTML.replace(
    /^(\s*)<mdp id="mdp([0-9]+)"><\/mdp>$/gm,
    (_, indent, index) => {
      return markdown[index]
        .split('\n')
        .map((line) => indent + line.trim())
        .join('\n')
    },
  )

  // Fix indents, format mustaches, remove empty attribute values, and return
  return formattedHTML
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
    .replace(/(<[^>]+?)=""([^>]*?>)/g, '$1$2')
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

/**
 * Sort HTML `attributes` by their name in a specified `order`.
 */
function sortAttributes(
  attribues: { name: string; value: string }[],
  order: (string | RegExp)[],
): void {
  const defaultIndex = order.indexOf('*')

  attribues.sort((a, b) => {
    let aIndex = order.findIndex((x) => {
      return (typeof x === 'string' && x === a.name) || (typeof x !== 'string' && x.test(a.name))
    })

    let bIndex = order.findIndex((x) => {
      return (typeof x === 'string' && x === b.name) || (typeof x !== 'string' && x.test(b.name))
    })

    if (aIndex === -1) {
      aIndex = defaultIndex
    }

    if (bIndex === -1) {
      bIndex = defaultIndex
    }

    if (aIndex === bIndex) {
      return a.name.localeCompare(b.name)
    }

    return aIndex - bIndex
  })
}
