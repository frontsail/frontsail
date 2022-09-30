import pc from 'picocolors'
import { table } from 'table'
import * as packageJSON from '../package.json'

/**
 * Describes a container tab.
 */
export interface Tab<T extends string> {
  /**
   * The displayed tab text.
   */
  label: string

  /**
   * Unique tab identifier.
   */
  value: T

  /**
   * Whether the tab is active.
   */
  active?: boolean
}

/**
 * Regular expression for extracting formatted strings (e.g '§g(green)', §b(blue)', etc.)
 */
const formatRegex = /§([a-z]{1,2})\((.+?\)?)\)/g

/**
 * Wait for specific `keys` to be pressed and invoke the related callback.
 * The keypress listener stops when a callback returns `true`.
 */
export function awaitKeys(keys: {
  [name: string]: () => Promise<boolean | void> | boolean | void
}): void {
  async function onInput(_: any, key: any): Promise<void> {
    if (keys[key.name]) {
      const stop = await keys[key.name]()

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
 * Clear the print outputs.
 */
export function clear(): void {
  console.clear()
}

/**
 * Create a new string with empty spaces between `left` and `right` text so that it
 * fits the current terminal width.
 */
export function createGap(left: string, right: string, offset: number = 0): string {
  return (
    left +
    ' '.repeat(process.stdout.columns - realLength(left) - realLength(right) + offset) +
    right
  )
}

/**
 * Print an empty line to `stdout`.
 */
export function emptyLine(): void {
  process.stdout.write('\n')
}

/**
 * Prepare a `message` for printing in the console by resolving various formatting
 * shortcodes.
 *
 * @example
 * format('g(foo)') // pc.green('foo')
 */
export function format(message: string): string {
  return message.replace(formatRegex, (_, color, text) => {
    switch (color) {
      case 'b':
        return pc.cyan(text)
      case 'd':
        return pc.dim(text)
      case 'g':
        return pc.green(text)
      case 'gb':
        return pc.bgGreen(text)
      case 'l':
        return pc.gray(text)
      case 'li':
        return pc.gray(pc.italic(text))
      case 'r':
        return pc.red(text)
      case 'rb':
        return pc.bgRed(text)
      case 'y':
        return pc.yellow(text)
      case 'yb':
        return pc.bgYellow(text)
      default:
        return text
    }
  })
}

/**
 * Get the current FrontSail CLI version.
 */
export function getCLIVersion(): string {
  return packageJSON.version
}

/**
 * Get the part after `src/(assets|components|pages)/` of a `normalizedPath`.
 */
export function getFileID(normalizedPath: string): string | null {
  const match = /^src\/(?:assets|components|pages)\/(.+)$/.exec(normalizedPath)
  return match ? match[1] : null
}

/**
 * Extract and return the directory name in the `src` directory from a `normalizedPath`.
 */
export function getSrcDirname(normalizedPath: string): 'assets' | 'components' | 'pages' | null {
  const match = /^src\/(assets|components|pages)\//.exec(normalizedPath)
  return match ? (match[1] as 'assets' | 'components' | 'pages') : null
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
  tabs: Tab<string>[] = [],
  hint: string = '',
): void {
  let tabsRow1 = ''
  let tabsRow2 = ''
  let tabsRow3 = ''

  tabs.forEach((tab, i) => {
    if (i === 0 && !tab.active) {
      tabsRow1 += ' '
      tabsRow2 += ' '
      tabsRow3 += '┌'
    }

    if (tab.active) {
      tabsRow1 += '┌─' + '─'.repeat(tab.label.length) + '─┐'
      tabsRow2 += `│ ${tab.label} │`
      tabsRow3 += (i === 0 ? '│ ' : '┘ ') + ' '.repeat(tab.label.length) + ' └'
    } else {
      tabsRow1 += ' '.repeat(tab.label.length + 2)
      tabsRow2 += ` §l(${tab.label}) `
      tabsRow3 += `─`.repeat(tab.label.length + 2)
    }
  })

  if (tabs.length > 0) {
    print(tabsRow1)
    print(tabsRow2 + ' '.repeat(process.stdout.columns - tabsRow1.length - realLength(hint)) + hint)
    print(tabsRow3 + '─'.repeat(process.stdout.columns - tabsRow1.length - 1) + '┐')
  }

  process.stdout.write(
    table(
      contents.map((line) => [
        [format(truncate(line, -4).replace(/[\u0001-\u0006\u0008\u0009\u000B-\u001A]/g, ''))],
      ]),
      {
        border: {
          topBody: tabs.length > 0 ? `` : `─`,
          topJoin: tabs.length > 0 ? `` : `┬`,
          topLeft: tabs.length > 0 ? `` : `┌`,
          topRight: tabs.length > 0 ? `` : `┐`,

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
  print(createGap(left, right), newLine)
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
    '@@@@@@@@@@@@@@@@@@@@@@@    ' + pc.cyan('FrontSail CLI'),
    '@@@@@@@@@@@@@@@@@@@@@      ' + pc.cyan(`v${getCLIVersion()}`),
    '',
  ]

  lines.forEach((line) => console.log(line.replace(/@/g, () => pc.bgCyan(' '))))
}

/**
 * Get the text length after formatting.
 */
export function realLength(text: string): number {
  return text.replace(formatRegex, '$2').length
}

/**
 * Truncate a unformatted text line to fit the terminal width.
 */
export function truncate(line: string, offset: number = 0): string {
  let match: RegExpExecArray | null = null
  let max: number = process.stdout.columns + offset

  do {
    match = formatRegex.exec(line)

    if (match) {
      max += match[1].length + 3

      if (match && match.index + match[0].length > max) {
        return line.slice(0, max - 3) + '…)'
      }
    }
  } while (match)

  return line.length > max ? line.slice(0, max - 1) + '…' : line
}
