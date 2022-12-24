import { spawn } from 'child_process'

const packages = ['utils', 'build', 'core', 'wright', 'hooks', 'cli']
let index = 0

function run() {
  spawn(`npm run dev:${packages[index]}`, { stdio: 'pipe', shell: true }).stdout.addListener(
    'data',
    (data) => {
      const message = data.toString()
      process.stdout.write(message)

      if (message.includes('Found 0 errors.') && index + 1 < packages.length) {
        index++
        run()
      }
    },
  )
}

run()
