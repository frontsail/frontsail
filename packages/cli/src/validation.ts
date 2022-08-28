import fs from 'fs-extra'
import semver from 'semver'

/**
 * Make sure the terminal has the minimum number of columns and rows and show an
 * error if the check fails.
 */
export function hasEnoughTerminalSpace():
  | true
  | { columns: { current: number; min: number }; rows: { current: number; min: number } } {
  const space = {
    columns: { current: process.stdout.columns, min: 80 },
    rows: { current: process.stdout.rows, min: 15 },
  }

  return space.columns.current >= space.columns.min && space.rows.current >= space.rows.min
    ? true
    : space
}

/**
 * Verify that the current Node.js version meets the minimum required version and
 * print instructions if the check fails.
 */
export function hasMinimumNodeVersion(): true | { current: string; min: string } {
  const version = { current: process.version.slice(1), min: '16.13.0' }
  return semver.satisfies(version.current, `>=${version.min}`) ? true : version
}

/**
 * Check if the current working directory has the `node_modules` directory.
 */
export function hasNpmDependencies(): boolean {
  return fs.existsSync('node_modules')
}

/**
 * Check if the current working directory is empty.
 */
export function isEmptyWorkingDirectory(): boolean {
  return fs.readdirSync('.').length === 0
}

/**
 * Check if the current working directory is a FrontSail project by looking at the
 * `devDependencies` of a package.json file.
 */
export function isFrontSailProject(): boolean {
  try {
    return !!fs.readJsonSync('package.json').devDependencies['@frontsail/cli']
  } catch (_) {
    return false
  }
}
