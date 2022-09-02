import { wright } from '@frontsail/wright'
import { spawn } from 'child_process'
import fs from 'fs-extra'
import ms from 'ms'
import ora, { Ora } from 'ora'
import { performance } from 'perf_hooks'
import { emptyLine, print } from './helpers'

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
