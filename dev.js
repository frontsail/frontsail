import { spawn } from 'child_process'

const packages = ['utils', 'core', 'wright', 'cli']

function start(index) {
  spawn(`npm run dev:${packages[index]}`, { stdio: 'pipe', shell: true }).stdout.addListener(
    'data',
    (data) => {
      const message = data.toString()
      process.stdout.write(message)

      if (message.includes('Found 0 errors.') && index + 1 < packages.length) {
        start(++index)
      }
    },
  )
}

start(0)
