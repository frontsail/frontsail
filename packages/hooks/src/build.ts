import { Diagnostic } from '@frontsail/core'
import { wright } from '@frontsail/wright'

/**
 * Build all pages, scripts, styles, and assets in the current project.
 */
export async function buildAll(): Promise<void> {
  await wright.rebuild()
}

/**
 * Build a single page by its `path`.
 * If a `html` string is given, the page will be updated beforehand.
 */
export function buildPage(path: string, html?: string): void {
  if (typeof html === 'string') {
    setPage(path, html)
  }

  wright.buildPage(path)
}

/**
 * Get all warnings and errors in the current project.
 */
export function getDiagnostics(): Diagnostic[] {
  return wright.getDiagnostics()
}

/**
 * Check if there are any warnings or errors in the current project.
 */
export function hasProblems(): boolean {
  return getDiagnostics().length > 0
}

/**
 * Read and initialize the project from the local `src` directory.
 */
export function init(): void {
  wright.newProject('production')
  wright.updateConfig()
  wright.setGlobals()
  wright.populate()
  wright.lintTemplates('*')
}

/**
 * Remove a page from the current project.
 */
export function removePage(path: string): void {
  wright.removeCustomPage(path)
}

/**
 * Register a new page with its `html` content in the current project.
 * If there is an existing page with the same `path`, it will be updated instead.
 */
export function setPage(path: string, html: string): void {
  wright.setCustomPage(path, html)
}
