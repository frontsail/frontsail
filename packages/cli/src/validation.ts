import fs from 'fs-extra'
import fetch from 'node-fetch'
import semver from 'semver'
import { emptyLine, print } from './helpers'

/**
 * Collection of newer versions of npm packages. Has null value if the current
 * version is the latest.
 */
const newerVersions: { [name: string]: string | null } = {}

/**
 * Check if there is a newer version of an npm package available.
 */
export async function checkLatestVersion(
  packageName: string,
  currentVersion: string,
  timeout: number = 1000,
): Promise<string | null> {
  if (newerVersions[packageName] !== undefined) {
    return newerVersions[packageName]
  }

  const promises = [
    fetch(`https://registry.npmjs.org/${packageName}/latest`)
      .then(async (response) => await response.json())
      .then((json: { version: string }) => {
        newerVersions[packageName] = semver.gt(json.version, currentVersion) ? json.version : null
        return newerVersions[packageName]
      })
      .catch((_) => null),
  ]

  if (typeof timeout === 'number') {
    promises.push(new Promise((resolve) => setTimeout(() => resolve(null), timeout)))
  }

  return Promise.race<string | null>(promises)
}

/**
 * Check if the current working directory has a FrontSail project with installed
 * npm dependencies.
 *
 * @returns whether the project is healthy.
 */
export function checkProjectHealth(silent: boolean = false): boolean {
  if (!isFrontSailProject()) {
    if (!silent) {
      emptyLine()
      print(
        '§rb( Error ) No FrontSail project was found in the current directory. Run §b(npx @frontsail/cli) to create a new project.',
      )
      emptyLine()
    }

    return false
  } else if (!hasNpmDependencies()) {
    if (!silent) {
      emptyLine()
      print(
        '§rb( Error ) This FrontSail project is missing npm dependencies. Run §b(npm i) or §b(npx @frontsail/cli) to install them.',
      )
      emptyLine()
    }

    return false
  }

  return true
}

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
    const packageJSON = fs.readJsonSync('package.json')

    return (
      (packageJSON.dependencies &&
        typeof packageJSON.dependencies === 'object' &&
        !!packageJSON.dependencies['@frontsail/cli']) ||
      (packageJSON.devDependencies &&
        typeof packageJSON.devDependencies === 'object' &&
        !!packageJSON.devDependencies['@frontsail/cli'])
    )
  } catch (_) {
    return false
  }
}
