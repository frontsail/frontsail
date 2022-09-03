#!/usr/bin/env node

import args from 'args'
import readline from 'readline'
import { build, initStarterProject } from './build'
import { Develop } from './Develop'
import { clear, emptyLine, print, printLogo } from './helpers'
import { MainMenu } from './MainMenu'
import {
  checkProjectHealth,
  hasEnoughTerminalSpace,
  hasMinimumNodeVersion,
  isEmptyWorkingDirectory,
} from './validation'

let commandUsed: boolean = false

readline.emitKeypressEvents(process.stdin)

args
  .option('silent', 'Prevent printing messages')
  .command('build', 'Build current project', (_, __, options: any) => {
    commandUsed = true

    if (checkProjectHealth()) {
      build(!!options.silent)
    }
  })
  .command('create', 'Create a new project', (_, __, options: any) => {
    commandUsed = true

    if (isEmptyWorkingDirectory()) {
      initStarterProject({
        files: true,
        git: true,
        npm: true,
        silent: options.silent,
        slang: false,
        return: false,
      }).then((success) => {
        if (success && !options.silent) {
          print('§gb(Land Ho!) A new FrontSail project has been created successfully.')
          emptyLine()
        }
      })
    } else if (!options.silent) {
      emptyLine()
      print(`§rb(Error) The current directory (${process.cwd()}) is not empty.`)
      emptyLine()
    }
  })
  .command('dev', 'Start development mode', (_, __, options: any) => {
    commandUsed = true

    if (checkProjectHealth()) {
      showUI('develop')
    }
  })

args.parse(process.argv)

if (!commandUsed) {
  showUI()
}

function showUI(screen: 'mainMenu' | 'develop' = 'mainMenu'): void {
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
    print('Resize your terminal window and try again.')
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
    print('Update your Node.js or visit https://nodejs.org for additional instructions.')
    emptyLine()
  }
  //
  // Show initial screen
  //
  else if (screen === 'mainMenu') {
    new MainMenu()
  } else if (screen === 'develop') {
    new Develop()
  }
}
