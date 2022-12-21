import { debounceParallel } from '../dist'

test('debounceParallel', async () => {
  let foo = 0

  function bar() {
    foo++
  }

  debounceParallel('baz', bar, 50)
  debounceParallel('baz', bar, 50)
  debounceParallel('qux', bar, 50)
  await new Promise((resolve) => setTimeout(resolve, 100))

  expect(foo).toBe(2)
})
