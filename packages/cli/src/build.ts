import { fillObject } from '@frontsail/utils'
import { wright } from '@frontsail/wright'
import { spawn } from 'child_process'
import fs from 'fs-extra'
import ms from 'ms'
import ora, { Ora } from 'ora'
import { performance } from 'perf_hooks'
import { awaitKeys, emptyLine, getCLIVersion, print } from './helpers'

/**
 * Describes the options for initializing the starter project.
 */
interface StarterProjectOptions {
  /**
   * Whether the starter project files should be created.
   */
  files?: boolean

  /**
   * Whether to initialize git.
   */
  git?: boolean

  /**
   * Whether to install the npm dependencies.
   */
  npm?: boolean

  /**
   * Whether to print messages.
   */
  silent?: boolean

  /**
   * Whether to use fancy messages.
   */
  slang?: boolean

  /**
   * Whether to display a message to return to the main menu.
   */
  return?: boolean
}

/**
 * Build the local project in production mode.
 *
 * @returns whether the build was successful.
 */
export async function build(silent: boolean = false): Promise<boolean> {
  let success: boolean

  if (fs.existsSync('frontsail.build.js')) {
    if (!silent) {
      emptyLine()
      print(`Discovered custom build file. Running script §b(frontsail.build.js)...`)
    }

    const start = performance.now()
    const exitCode = await new Promise<number | null>((resolve) => {
      spawn('node frontsail.build.js --no-serve', {
        stdio: silent ? 'pipe' : 'inherit',
        shell: true,
      }).once('exit', (code) => resolve(code))
    })
    const time = ms(Math.round(performance.now() - start))

    success = exitCode === 0

    if (!silent) {
      emptyLine()
      print(`Script finished in §b(${time}).`)
      emptyLine()
    }
  } else {
    const start = performance.now()
    let spinner: Ora | null = null

    if (!silent) {
      emptyLine()
      spinner = ora({ text: 'Just a moment...', discardStdin: false }).start()
    }

    await wright.start('production')

    const time = ms(Math.round(performance.now() - start))
    const diagnostics = wright.getDiagnostics()

    spinner?.stop()

    if (diagnostics.length === 0) {
      success = true

      if (!silent) {
        print(`§gb(Bottoms up!) Build completed in §b(${time}).`)
        emptyLine()
      }
    } else {
      success = false

      if (!silent) {
        let warnings: number = 0
        let errors: number = 0

        diagnostics.forEach((diagnostic) => {
          if (diagnostic.severity === 'warning') {
            warnings++
          } else {
            errors++
          }
        })

        const prefix = `§${errors > 0 ? 'r' : 'y'}b(Close to the wind!)`
        const problems =
          (errors > 0 ? `§rb(${errors}) error${errors > 1 ? 's' : ''}` : '') +
          (errors > 0 && warnings > 0 ? ' and ' : '') +
          (warnings > 0 ? `§yb(${warnings}) warning${warnings > 1 ? 's' : ''}` : '')

        print(`${prefix} Build completed in §b(${time}) with ${problems}.`)
        emptyLine()
      }
    }
  }

  return success
}

/**
 * Create starter project files in the current working directory, initialize git,
 * and install npm dependencies.
 *
 * @returns whether the initialization was successful.
 */
export async function initStarterProject(
  options: StarterProjectOptions = { files: true, git: true, npm: true },
): Promise<boolean> {
  options = fillObject(options, {
    files: false,
    git: false,
    npm: false,
    silent: false,
    slang: true,
    return: true,
  })

  let spinner: Ora | null = null

  if (!options.silent) {
    emptyLine()
    spinner = ora({
      text: options.slang ? 'Working on it...' : 'Initializing a new project...',
      discardStdin: false,
    }).start()
  }

  let npmStatus: number | null = null

  if (options.files) {
    wright.initStarterProject(`^${getCLIVersion()}`)
  }

  if (options.git) {
    await new Promise<void>((resolve) =>
      spawn('git init', { shell: true }).once('exit', () => resolve()),
    )
  }

  if (options.npm) {
    npmStatus = await new Promise<number | null>((resolve) => {
      spawn('npm i', { shell: true }).once('exit', (code) => resolve(code))
    })
  }

  spinner?.stop()

  if (npmStatus === 1) {
    if (!options.silent) {
      if (options.slang) {
        print('§rb(Batten down the hatches!)')
        print(
          `There was an error installing npm dependencies. Try to install them manually to see where it went wrong.`,
        )
      } else {
        print(
          `§rb(Error) while installing npm dependencies. Try to install them manually to see where it went wrong.`,
        )
      }

      emptyLine()

      if (options.return) {
        print('§d(Press) §b(Enter) §d(to return to the main menu.)', false)

        await new Promise<void>((resolve) =>
          awaitKeys({
            return: () => {
              resolve()
              return true
            },
          }),
        )
      }
    }

    return false
  }

  return true
}
