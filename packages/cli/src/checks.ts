import fs from 'fs-extra'
import semver from 'semver'
import { clear, emptyLine, print, printLogo } from './helpers'

/**
 * Verify that the current Node.js version meets the minimum required version and
 * print instructions if the check fails.
 */
export function checkNodeVersion(): boolean {
  const version = process.version.slice(1)

  if (semver.satisfies(version, '>=16')) {
    return true
  }

  clear()
  printLogo()
  print('rb(Batten down the hatches!)')
  print(
    `This ship requires a minimum Node.js version of g(16.13.0) (detected version is r(${version})).`,
  )
  emptyLine()
  print('l(Please update your Node.js or visit https://nodejs.org for additional instructions.)')
  emptyLine()

  return false
}

/**
 * Make sure the terminal has the minimum number of columns and rows and show an
 * error if the check fails.
 */
export function hasEnoughSpace(): boolean {
  const minColumns = 80
  const minRows = 15

  if (process.stdout.columns >= minColumns && process.stdout.rows >= minRows) {
    return true
  }

  const columns =
    process.stdout.columns >= minColumns
      ? `g(${process.stdout.columns})`
      : `r(${process.stdout.columns})`

  const rows =
    process.stdout.rows >= minRows ? `g(${process.stdout.rows})` : `r(${process.stdout.rows})`

  clear()
  print("rb(We're running a tight ship!)")
  print(
    `This CLI tool requires space of at least g(80) columns and g(15) rows (detected ${columns} columns and ${rows} rows).`,
  )
  emptyLine()
  print('l(Resize your terminal window and try again.)')
  emptyLine()

  return false
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
