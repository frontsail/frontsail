import { lineColumnToRange } from '..'

test('lineColumnToRange', () => {
  expect(lineColumnToRange('foo', [1, 1])).toEqual({ from: 1, to: 1 })
  expect(lineColumnToRange('foo', [1, 1], [1, 2])).toEqual({ from: 1, to: 2 })
  expect(lineColumnToRange('foo', [1, 1], [1, 3])).toEqual({ from: 1, to: 3 })
  expect(lineColumnToRange('foo', [1, 1], [1, 4])).toEqual({ from: 1, to: 3 })
  expect(lineColumnToRange('foo', [1, 4])).toEqual({ from: 3, to: 3 })
  expect(lineColumnToRange('foo\nbar', [2, 1])).toEqual({ from: 4, to: 4 })
  expect(lineColumnToRange('foo\nbar\n', [1, 2], [4, 4])).toEqual({ from: 2, to: 8 })
})
