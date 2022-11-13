import { debounce } from '../dist'

test('debounce', async () => {
  let foo = 0

  function bar() {
    foo++
  }

  debounce('baz', bar, 50)
  debounce('baz', bar, 50)
  debounce('qux', bar, 50)
  await new Promise((resolve) => setTimeout(resolve, 100))

  expect(foo).toBe(2)
})
