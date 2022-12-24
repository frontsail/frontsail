import { codeFrameColumns } from '@babel/code-frame'
import fs from 'fs-extra'
import path from 'path'
import pc from 'picocolors'
import { Message } from './types'

export function log(message: Message): void {
  const messages: string[] = [message.text]

  if (message.subject) {
    const color = message.color ? pc[message.color] : pc.blue
    messages.unshift(pc.bold(color(message.subject)))
  }

  if (message.timestamp) {
    const time = new Date(message.timestamp).toLocaleTimeString()
    messages.unshift(pc.gray(`[${time}]`))
  }

  console.log(...messages)
}

export function codeFrame(
  file: string,
  start: [line: number, column: number],
  end: [line: number, column: number],
  severity: 'error' | 'warning',
): void {
  if (fs.existsSync(file)) {
    const filePath = path.resolve(path.relative(process.cwd(), file))
    const code = fs.readFileSync(filePath, 'utf-8')
    const color = severity === 'error' ? pc.red : pc.yellow
    const frame = codeFrameColumns(code, {
      start: { line: start[0], column: start[1] },
      end: { line: end[0], column: end[1] },
    })
      .replace(/^( *\|\s*)(\^+)/gm, `$1${color('$2')}`)
      .replace(/^(> *[0-9]*)( *\|)/gm, color('$1') + pc.gray('$2'))
      .replace(/^( *[0-9]* *\|)/gm, pc.gray('$1'))

    console.log(frame)
    console.log(pc.gray(filePath))
  }
}
