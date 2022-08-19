import { split } from '..'

test('split', () => {
  expect(split('a|b', '|')).toEqual([
    { value: 'a', from: 0, to: 1 },
    { value: 'b', from: 2, to: 3 },
  ])
})
