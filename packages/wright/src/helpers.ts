import { isPagePath } from '@frontsail/core'

/**
 * Transform a relative `filePath` into a page path.
 */
export function filePathToPagePath(filePath: string, loose: boolean = false): string | null {
  let pagePath: string | null = null

  if (filePath === 'index.html' || filePath.endsWith('/index.html')) {
    pagePath = '/' + filePath.replace(/\/?index\.html$/, '')
  } else if (filePath.endsWith('.html')) {
    pagePath = '/' + filePath.replace(/\.html$/, '')
  }

  if (loose) {
    return pagePath ?? '/' + filePath.replace(/\.html$/, '')
  }

  return pagePath && isPagePath(pagePath) ? pagePath : null
}

/**
 * Transform a `pagePath` into a relative file path.
 */
export function pagePathToFilePath(pagePath: string, loose: boolean = false): string | null {
  if (isPagePath(pagePath)) {
    return pagePath === '/' ? 'index.html' : pagePath.slice(1) + '/index.html'
  } else if (loose) {
    return pagePath.replace(/^\//, '') + '/index.html'
  }

  return null
}
