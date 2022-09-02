import { wright } from '@frontsail/wright'
import { spawn } from 'child_process'
import fs from 'fs-extra'
import inquirer, { QuestionCollection } from 'inquirer'
import ora from 'ora'
import { build } from './build'
import { DevelopPrompt } from './DevelopPrompt'
import { awaitKeys, clear, emptyLine, print, printLogo } from './helpers'
import { hasNpmDependencies, isEmptyWorkingDirectory, isFrontSailProject } from './validation'

/**
 * Describes the previous screen, prompt, or action.
 */
type Previously = 'back' | 'fail' | 'none' | 'success'

/**
 * Describes `inquirer` answers for this prompt.
 */
type Answers = { action: 'build' | 'develop' | 'exit' | 'npmInstall' | 'newProject' }

/**
 * Describes the options for initializing the starter project.
 */
interface StarterProjectOptions {
  /**
   * Whether the starter project files should be created.
   */
  files: boolean

  /**
   * Whether to initialize git.
   */
  git: boolean

  /**
   * Whether to install the npm dependencies.
   */
  npm: boolean
}

/**
 * Displays the home interface.
 */
export class MainMenuPrompt {
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

    clear()
    printLogo()

    const question: QuestionCollection<Answers> = {
      type: 'list',
      name: 'action',
      message: this._welcomeMessages[this._previously],
    }

    if (isFrontSailProject()) {
      // @todo check if local cli version is outdated

      if (hasNpmDependencies()) {
        question.choices = [
          { name: 'Start developing', value: 'develop' },
          { name: 'Build project', value: 'build' },
          // @todo Deploy to server (only visible when .env variables DEPLOY_URL and DEPLOY_KEY are present)
          { name: 'Exit', value: 'exit' },
        ]
      } else {
        if (this._previously === 'none') {
          print("I've found a FrontSail project in here but npm dependencies are missing.")
          emptyLine()
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

    this._questions.push(question)
    this._print()
  }

  /**
   * Create starter project files in the current working directory, initialize git,
   * and install npm dependencies.
   *
   * @returns whether the initialization was successful.
   */
  protected async _initStarterProject(
    options: StarterProjectOptions = { files: true, git: true, npm: true },
  ): Promise<boolean> {
    emptyLine()

    const spinner = ora({ text: 'Working on it...', discardStdin: false }).start()
    let npmStatus: number | null = null

    if (options.files) {
      wright.initStarterProject()
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

    spinner.stop()

    if (npmStatus === 1) {
      print('§rb(Batten down the hatches!)')
      print(
        `There was an error installing npm dependencies. Try to install them manually to see where it went wrong.`,
      )
      emptyLine()
      print('§d(Press) §b(Enter) §d(to return to the main menu.)', false)

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

    return true
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
            new DevelopPrompt()
          } else {
            new MainMenuPrompt('fail')
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

      new MainMenuPrompt(success ? 'success' : 'fail')
    }
  }

  /**
   * Handle the prompt answer 'develop'.
   */
  protected async _onDevelop(): Promise<void> {
    new DevelopPrompt()
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
    const success = await this._initStarterProject({ files: false, git: false, npm: true })
    new MainMenuPrompt(success ? 'success' : 'fail')
  }

  /**
   * Handle the prompt answer 'newProject'.
   */
  protected async _onNewProject(): Promise<void> {
    if (isEmptyWorkingDirectory()) {
      const success = await this._initStarterProject()
      new MainMenuPrompt(success ? 'success' : 'fail')
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
            const success = await this._initStarterProject()
            new MainMenuPrompt(success ? 'success' : 'fail')
          } else {
            new MainMenuPrompt('back')
          }
        })
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
      }
    })
  }
}
