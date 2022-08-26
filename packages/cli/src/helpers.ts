import pc from 'picocolors'
import { table } from 'table'
import * as packageJSON from '../package.json'

/**
 * Wait for specific `keys` to be pressed and invoke the related callback.
 * The keypress listener stops when a callback returns `true`.
 */
export function awaitKeys(keys: { [name: string]: () => boolean | void }): void {
  async function onInput(_: any, key: any): Promise<void> {
    if (keys[key.name]) {
      const stop = keys[key.name]()

      if (stop) {
        process.stdin.off('keypress', onInput)
      }
    }
  }

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('keypress', onInput)
}

/**
 * Clear the console.
 */
export function clear(): void {
  console.clear()
}

/**
 * Print an empty line to `stdout`.
 */
export function emptyLine(): void {
  process.stdout.write('\n')
}

/**
 * Hide the text cursor.
 */
export function hideCursor(): void {
  process.stdout.write('\x1B[?25l')
}

/**
 * Format and print a `message` to `stdout`.
 */
export function print(message: string | number, newLine: boolean = true): void {
  process.stdout.write(format(message.toString()) + (newLine ? '\n' : ''))
}

/**
 * Print `contents` in a boxed layout with optional `tabs`.
 */
export function printContainer(
  contents: string[],
  tabs: {
    active?: string
    choices?: string[]
    hint?: string
  } = {},
): void {
  let tabsRow1 = ''
  let tabsRow2 = ''
  let tabsRow3 = ''

  const hasTabChoices = !!tabs.choices && tabs.choices.length > 0

  tabs.choices?.forEach((choice, i) => {
    if (i === 0 && choice !== tabs.active) {
      tabsRow1 += ' '
      tabsRow2 += ' '
      tabsRow3 += '┌'
    }

    if (choice === tabs.active) {
      tabsRow1 += '┌─' + '─'.repeat(choice.length) + '─┐'
      tabsRow2 += `│ ${choice} │`
      tabsRow3 += (i === 0 ? '│ ' : '┘ ') + ' '.repeat(choice.length) + ' └'
    } else {
      tabsRow1 += ' '.repeat(choice.length + 2)
      tabsRow2 += ` l(${choice}) `
      tabsRow3 += `─`.repeat(choice.length + 2)
    }
  })

  if (hasTabChoices) {
    const hint = tabs.hint ? `d(${tabs.hint}) ` : ''
    const hintOffset = tabs.hint ? tabs.hint.length + 1 : 0

    print(tabsRow1)
    print(tabsRow2 + ' '.repeat(process.stdout.columns - tabsRow1.length - hintOffset) + hint)
    print(tabsRow3 + '─'.repeat(process.stdout.columns - tabsRow1.length - 1) + '┐')
  }

  console.log(
    table(
      contents.map((line) => [[format(line)]]),
      {
        border: {
          topBody: hasTabChoices ? `` : `─`,
          topJoin: hasTabChoices ? `` : `┬`,
          topLeft: hasTabChoices ? `` : `┌`,
          topRight: hasTabChoices ? `` : `┐`,

          bottomBody: `─`,
          bottomJoin: `┴`,
          bottomLeft: `└`,
          bottomRight: `┘`,

          bodyLeft: `│`,
          bodyRight: `│`,
          bodyJoin: `│`,

          joinBody: `─`,
          joinLeft: `├`,
          joinRight: `┤`,
          joinJoin: `┼`,
        },
        columns: [
          {
            width: process.stdout.columns - 4,
            truncate: process.stdout.columns - 4,
          },
        ],
        singleLine: true,
      },
    ),
  )
}

/**
 * Print messages on the `left` and `right` side in the console.
 */
export function printGap(left: string, right: string, newLine: boolean = false): void {
  const leftLength = left.replace(/([a-z]{1,2})\((.+?\)?)\)/g, '$2').length
  const rightLength = right.replace(/([a-z]{1,2})\((.+?\)?)\)/g, '$2').length

  print(left + ' '.repeat(process.stdout.columns - leftLength - rightLength) + right, newLine)
}

/**
 * Print the FrontSail logo with the FrontSail CLI version.
 */
export function printLogo(): void {
  const lines = [
    '            @@@@@@@@@',
    '            @@@@@@@@@@@',
    '            @@@@    @@@@',
    '            @@@@     @@@@',
    '            @@@@    @@@@',
    '@@@@@@@@@@@@@@@@@@@@@@@    FrontSail CLI',
    '@@@@@@@@@@@@@@@@@@@@@      v' + packageJSON.version,
    '',
  ]

  lines.forEach((line) => console.log(line.replace(/@/g, () => pc.bgWhite(' '))))
}

/**
 * Prepare a `message` for printing in the console by resolving various formatting
 * shortcodes.
 *
 * @example
 * format('g(foo)') // pc.green('foo')
 */
export function format(message: string): string {
  return message.replace(/([a-z]{1,2})\((.+?\)?)\)/g, (_, color, text) => {
    switch (color) {
      case 'b':
        return pc.cyan(text)
      case 'd':
        return pc.dim(text)
      case 'g':
        return pc.green(text)
      case 'l':
        return pc.gray(text)
      case 'li':
        return pc.gray(pc.italic(text))
      case 'r':
        return pc.red(text)
      case 'rb':
        return pc.bgRed(text)
      default:
        return text
    }
  })
}
