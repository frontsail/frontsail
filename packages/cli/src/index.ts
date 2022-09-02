#!/usr/bin/env node

import args from 'args'
import { build } from './build'
import { clear, emptyLine, print, printLogo } from './helpers'
import { InitialPrompt } from './InitialPrompt'
import {
  hasEnoughTerminalSpace,
  hasMinimumNodeVersion,
  hasNpmDependencies,
  isFrontSailProject,
} from './validation'

let commandUsed: boolean = false

args
  .option('silent', 'Hide build logs')
  .command('build', 'Build project', (_, __, options: any) => {
    commandUsed = true

    if (!isFrontSailProject()) {
      if (!options.silent) {
        emptyLine()
        print(
          'No FrontSail project was found in the current directory. Run §b(npx @frontsail/cli) to create a new project.',
        )
        emptyLine()
      }
    } else if (!hasNpmDependencies()) {
      if (!options.silent) {
        emptyLine()
        print(
          'This FrontSail project is missing npm dependencies. Run §b(npm i) or §b(npx @frontsail/cli) to install them.',
        )
        emptyLine()
      }
    } else {
      build(!!options.silent)
    }
  })

args.parse(process.argv)

if (!commandUsed) {
  const space = hasEnoughTerminalSpace()
  const version = hasMinimumNodeVersion()

  // Check terminal space
  //
  if (space !== true) {
    const columns =
      space.columns.current >= space.columns.min
        ? `§g(${space.columns.current})`
        : `§rb(${space.columns.current})`

    const rows =
      space.rows.current >= space.rows.min
        ? `§g(${space.rows.current})`
        : `§rb(${space.rows.current})`

    clear()
    print("§rb(We're running a tight ship!)")
    print(
      `This CLI tool requires space of at least §g(80) columns and §g(15) rows (detected ${columns} columns and ${rows} rows).`,
    )
    emptyLine()
    print('§l(Resize your terminal window and try again.)')
    emptyLine()
  }
  //
  // Check Node.js version
  //
  else if (version !== true) {
    clear()
    printLogo()
    print('§rb(Batten down the hatches!)')
    print(
      `This ship requires a minimum Node.js version of §g(${version.min}) (detected version is §rb(${version.current})).`,
    )
    emptyLine()
    print('§l(Please update your Node.js or visit https://nodejs.org for additional instructions.)')
    emptyLine()
  }
  //
  // Show home screen
  //
  else {
    new InitialPrompt()
  }
}
