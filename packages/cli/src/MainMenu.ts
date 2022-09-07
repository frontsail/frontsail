import { wright } from '@frontsail/wright'
import fs from 'fs-extra'
import inquirer, { QuestionCollection } from 'inquirer'
import ora, { Ora } from 'ora'
import semver from 'semver'
import { build, initStarterProject } from './build'
import { Develop } from './Develop'
import { awaitKeys, clear, emptyLine, getCLIVersion, print, printLogo } from './helpers'
import {
  checkLatestVersion,
  hasNpmDependencies,
  isEmptyWorkingDirectory,
  isFrontSailProject,
} from './validation'

/**
 * Describes the previous screen, prompt, or action.
 */
type Previously = 'back' | 'fail' | 'none' | 'projectCreated' | 'success'

/**
 * Describes `inquirer` answers for this prompt.
 */
type Answers = { action: 'build' | 'develop' | 'exit' | 'npmInstall' | 'newProject' | 'update' }

/**
 * Displays the home interface.
 */
export class MainMenu {
  /**
   * The situation (screen, prompt, or action) that occurred prior to this prompt.
   */
  protected _previously: Previously

  /**
   * Situational welcome messages dependent on the previous situation.
   */
  protected _welcomeMessages: Record<Previously, string> = {
    back: 'Aye aye! What else can I do?',
    fail: 'Down in the doldrums! What are we going to do now?',
    none: "Ahoy, Captain! What's your command?",
    projectCreated: 'Land Ho! What shall we do next?',
    success: 'Well, that was a big hit! What shall we do next?',
  }

  /**
   * Collection of `inquirer` questions.
   */
  protected _questions: QuestionCollection<Answers>[] = []

  /**
   * Instantiate the prompt.
   */
  constructor(previously: Previously = 'none') {
    this._previously = previously
    this._init()
  }

  /**
   * Initialize the prompt.
   */
  protected async _init(): Promise<void> {
    let spinner: Ora | null = null
    let title: string = ''

    if (this._previously === 'none') {
      emptyLine()
      spinner = ora({ text: 'Getting underway...', discardStdin: false }).start()
    }

    const question: QuestionCollection<Answers> = {
      type: 'list',
      name: 'action',
      message: this._welcomeMessages[this._previously],
    }

    if (isFrontSailProject()) {
      if (hasNpmDependencies()) {
        const additionalChoices: { name: string; value: string }[] = []
        const newerVersion = await checkLatestVersion('@frontsail/cli', getCLIVersion())

        if (newerVersion) {
          additionalChoices.push({
            name: 'Update FrontSail',
            value: 'update',
          })
        }

        question.choices = [
          { name: 'Start developing', value: 'develop' },
          { name: 'Build project', value: 'build' },
          ...additionalChoices,
          // @todo Deploy to server (only visible when .env variables DEPLOY_URL and DEPLOY_KEY are present)
          { name: 'Exit', value: 'exit' },
        ]
      } else {
        if (this._previously === 'none') {
          title = "I've found a FrontSail project in here but npm dependencies are missing."
          question.message = 'What should I do?'
        }

        question.choices = [
          { name: 'Install npm dependencies', value: 'npmInstall' },
          { name: 'Exit', value: 'exit' },
        ]
      }
    } else {
      question.choices = [
        { name: 'Create a new project', value: 'newProject' },
        { name: 'Exit', value: 'exit' },
      ]
    }

    spinner?.stop()

    clear()
    printLogo()

    if (title) {
      print(title)
      emptyLine()
    }

    this._questions.push(question)
    this._print()
  }

  /**
   * Handle the prompt answer 'build'.
   */
  protected async _onBuild(): Promise<void> {
    const success = await build()

    if (!fs.existsSync('frontsail.build.js') && !success) {
      inquirer
        .prompt<{ showDiagnostics: boolean }>([
          {
            type: 'list',
            name: 'showDiagnostics',
            message: "Do you wan't check the diagnostics?",
            choices: [
              { name: 'Yes (Start development mode)', value: true },
              { name: 'No  (Return to main menu)', value: false },
            ],
            default: true,
          },
        ])
        .then(async (answers) => {
          if (answers.showDiagnostics) {
            new Develop()
          } else {
            new MainMenu('fail')
          }
        })
    } else {
      print('§d(Press) §b(Enter) §d(to return to the main menu.)', false)

      await new Promise<void>((resolve) =>
        awaitKeys({
          return: () => {
            resolve()
            return true
          },
        }),
      )

      new MainMenu(success ? 'success' : 'fail')
    }
  }

  /**
   * Handle the prompt answer 'develop'.
   */
  protected async _onDevelop(): Promise<void> {
    new Develop()
  }

  /**
   * Handle the prompt answer 'exit'.
   */
  protected _onExit(): void {
    clear()
    print('§li(Fair winds and following seas!)')
    emptyLine()
    process.exit(0)
  }

  /**
   * Handle the prompt answer 'npmInstall'.
   */
  protected async _onNpmInstall(): Promise<void> {
    const success = await initStarterProject({ npm: true, return: true })
    new MainMenu(success ? 'success' : 'fail')
  }

  /**
   * Handle the prompt answer 'newProject'.
   */
  protected async _onNewProject(): Promise<void> {
    if (isEmptyWorkingDirectory()) {
      const success = await initStarterProject({ files: true, git: true, npm: true, return: true })
      new MainMenu(success ? 'projectCreated' : 'fail')
    } else {
      emptyLine()
      print(`It seems like the current directory (${process.cwd()}) is not empty...`)
      emptyLine()

      inquirer
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
        .then(async (answers) => {
          if (answers.clean) {
            wright.clearCurrentDirectory()
            const success = await initStarterProject({
              files: true,
              git: true,
              npm: true,
              return: true,
            })
            new MainMenu(success ? 'projectCreated' : 'fail')
          } else {
            new MainMenu('back')
          }
        })
    }
  }

  /**
   * Handle the prompt answer 'update'.
   */
  protected async _onUpdate(): Promise<void> {
    const packageJSON = fs.readJsonSync('package.json')

    for (const dependencies of ['dependencies', 'devDependencies']) {
      if (packageJSON[dependencies] && typeof packageJSON[dependencies] === 'object') {
        for (const name in packageJSON[dependencies]) {
          if (name.startsWith('@frontsail/')) {
            const currentVersion = semver.coerce(packageJSON[dependencies][name])?.raw
            const newerVersion = await checkLatestVersion(name, currentVersion ?? '0.0.0', 30000)

            if (newerVersion) {
              packageJSON[dependencies][name] = `^${newerVersion}`
            }
          }
        }
      }
    }

    fs.outputJSONSync('package.json', packageJSON, { spaces: 2 })

    const success = await initStarterProject({ npm: true, return: true })

    if (success) {
      const newCLIVersion = await checkLatestVersion('@frontsail/cli', getCLIVersion())

      print(
        '§gb( All hands on deck! ) FrontSail dependencies have been updated to the latest versions.',
      )
      emptyLine()
      print(`Run §b(npx @frontsail/cli) to use version §b(${newCLIVersion}).`)
      emptyLine()
    } else {
      new MainMenu('fail')
    }
  }

  /**
   * Render the prompt.
   */
  protected _print(): void {
    inquirer.prompt<Answers>(this._questions).then(async (answers) => {
      switch (answers.action) {
        case 'build':
          this._onBuild()
          break
        case 'develop':
          this._onDevelop()
          break
        case 'exit':
          this._onExit()
          break
        case 'npmInstall':
          this._onNpmInstall()
          break
        case 'newProject':
          this._onNewProject()
          break
        case 'update':
          this._onUpdate()
          break
      }
    })
  }
}
