import { spawn } from 'child_process'
import fs from 'fs-extra'
import http from 'http'
import ora from 'ora'
import portfinder from 'portfinder'
import handler from 'serve-handler'
import enableDestroy from 'server-destroy'
import { awaitKeys, emptyLine, print } from './helpers'

/**
 * Create a server handler with `serve`.
 */
const serverHandler = http.createServer((request, response) => {
  return handler(request, response, { public: 'dist' })
})

/**
 * The current server instance.
 */
let server: http.Server | null = null

/**
 * Remove all files and directories from the current working directory.
 */
export function emptyCurrentDirectory(): void {
  fs.emptyDirSync('.')
}

/**
 * Create starter project files and directories, initialize GIT, and install npm
 * dependencies.
 */
export async function initProject(): Promise<boolean> {
  emptyLine()

  const spinner = ora({ text: 'Working on it...', discardStdin: false }).start()

  fs.ensureDirSync('src/assets')
  fs.ensureDirSync('src/components')
  fs.ensureDirSync('src/pages')

  fs.writeFileSync('.gitignore', 'dist/\n')

  fs.writeJsonSync(
    'package.json',
    {
      name: 'my-frontsail-project',
      version: '0.1.0',
      type: 'module',
      scripts: {
        build: '@frontsail/cli --build',
        dev: '@frontsail/cli --dev',
        frontsail: '@frontsail/cli',
      },
      devDependencies: {
        '@frontsail/cli': '^0.1.0',
      },
    },
    {
      spaces: 2,
    },
  )

  spawn('git init', { shell: true })

  const status = await new Promise<number | null>((resolve) => {
    spawn('npm i', { shell: true }).once('exit', (code) => resolve(code))
  })

  if (status === 1) {
    spinner.stop()

    print('rb(Batten down the hatches!)')
    print(
      `There was an error installing npm dependencies. Try to install them manually to see where it went wrong.`,
    )
    emptyLine()
    print('d(Press) b(Enter) d(to return to the main menu.)')

    await new Promise<void>((resolve) =>
      awaitKeys({
        return: () => {
          resolve()
          return true
        },
      }),
    )

    return false
  }

  spinner.stop()

  return true
}

/**
 * Start preview server.
 */
export async function serve(): Promise<number> {
  const port = await portfinder.getPortPromise({ port: 5417 })

  await new Promise<void>((resolve) => {
    server = serverHandler.listen(port, () => resolve())
  })

  enableDestroy(server!)

  return port
}

/**
 * Stop preview server.
 */
export function stopServe(): void {
  if (server) {
    server.removeAllListeners()
    server.destroy()
  }
}
