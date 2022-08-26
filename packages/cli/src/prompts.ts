import { nth } from '@frontsail/utils'
import fs from 'fs-extra'
import inquirer, { QuestionCollection } from 'inquirer'
import { emptyCurrentDirectory, initProject, serve, stopServe } from './actions'
import { isFrontSailProject } from './checks'
import {
  awaitKeys,
  clear,
  emptyLine,
  hideCursor,
  print,
  printContainer,
  printGap,
  printLogo,
} from './helpers'

/**
 * Ask the user to clean the current working directory if not empty.
 */
export async function cleanCurrentDirectoryPrompt(): Promise<boolean> {
  emptyLine()
  print(`It seems like the current directory (${process.cwd()}) is not empty...`)
  emptyLine()

  return inquirer
    .prompt<{ clean: boolean }>([
      {
        type: 'list',
        name: 'clean',
        message: 'Do you want me to clean it up?',
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
        default: false,
      },
    ])
    .then((answers) => {
      if (answers.clean) {
        emptyCurrentDirectory()
      }

      return answers.clean
    })
}

/**
 * Show a tabbed interface with live build summary and diagnostics.
 */
export async function developPrompt(serverPort: number): Promise<void> {
  const tabs: string[] = ['Summary', 'Diagnostics']
  const contents: string[] = [
    `Assets: g(${3})`,
    `Components: g(${4})`,
    `Globals: g(${2})`,
    `Pages: g(${1})`,
    '',
    `Scripts: g(${'56 KB'})`,
    `Styles: g(${'23 KB'})`,
    '',
    `Preview server running at g(http://localhost:${serverPort})`,
  ]

  let hintShown: boolean = false
  let activeTab: string = 'Summary'

  function repaint(): void {
    clear()
    printContainer(contents, {
      active: activeTab,
      choices: tabs,
      hint: hintShown ? undefined : '(Use arrow keys to navigate)',
    })

    for (let i = 0; i < process.stdout.rows - 6 - contents.length; i++) {
      emptyLine()
    }

    printGap('d(Waiting for file changes...)', 'd((Press) b(Q) d(to quit))')
    hideCursor()
  }

  repaint()
  hintShown = true

  awaitKeys({
    up: () => {},
    downt: () => {},
    right: () => {
      activeTab = nth(tabs, tabs.indexOf(activeTab) + 1)
      repaint()
    },
    left: () => {
      activeTab = nth(tabs, tabs.indexOf(activeTab) - 1)
      repaint()
    },
    q: () => {
      stopServe()
      process.stdout.off('resize', repaint)
      initialPrompt('back')
      return true
    },
  })

  process.stdout.on('resize', repaint)
}

/**
 * Display the home interface.
 */
export async function initialPrompt(
  prevScreen: 'back' | 'fail' | 'none' | 'projectCreated' = 'none',
): Promise<void> {
  clear()
  printLogo()

  const messages = {
    back: 'Aye aye! What else can I do?',
    fail: 'Down in the doldrums! What are we going to do now?',
    none: "Ahoy, Captain! What's your command?",
    projectCreated: 'What shall we do next?',
  }

  if (prevScreen === 'projectCreated') {
    print('The new project is set up!')
    emptyLine()
  }

  const actionQuestion: QuestionCollection = {
    type: 'list',
    name: 'action',
    message: messages[prevScreen],
    choices: [],
  }

  const questions: QuestionCollection[] = [actionQuestion]

  if (isFrontSailProject()) {
    // @todo check if local cli version is outdated
    // @todo check if node_modules exists (Install npm dependencies) <= I've found a FrontSail project in here but npm dependencies are missing. Should I install them?

    actionQuestion.choices = [
      { name: 'Start developing', value: 'develop' },
      { name: 'Build pages', value: 'build' },
      { name: 'Format files', value: 'format' },
      { name: 'Tell me a joke', value: 'joke' },
      { name: 'Exit', value: 'exit' },
    ]
  } else {
    actionQuestion.choices = [
      { name: 'Create a new project', value: 'newProject' },
      { name: 'Exit', value: 'exit' },
    ]
  }

  inquirer
    .prompt<{ action: 'build' | 'develop' | 'exit' | 'newProject' }>(questions)
    .then(async (answers) => {
      switch (answers.action) {
        case 'build':
          // Bottoms up!
          break
        case 'develop':
          developPrompt(await serve())
          break
        case 'exit':
          clear()
          print('li(Fair winds and following seas!)')
          emptyLine()
          break
        case 'newProject':
          if (fs.readdirSync('.').length === 0) {
            const success = await initProject()
            initialPrompt(success ? 'projectCreated' : 'fail')
          } else {
            cleanCurrentDirectoryPrompt().then(async (cleaned) => {
              if (cleaned) {
                const success = await initProject()
                initialPrompt(success ? 'projectCreated' : 'fail')
              } else {
                initialPrompt('back')
              }
            })
          }
          break
      }

      return answers
    })
}
