import { lineColumnToOffset, offsetToLineColumn } from '..'

test('offsetToLineColumn', () => {
  expect(offsetToLineColumn('foo', 0, 1)).toEqual({ start: [1, 1], end: [1, 2] })
  expect(offsetToLineColumn('foo', 0, 2)).toEqual({ start: [1, 1], end: [1, 3] })
  expect(offsetToLineColumn('foo', 0, 3)).toEqual({ start: [1, 1], end: [1, 4] })
  expect(offsetToLineColumn('foo', 0, 4)).toEqual({ start: [1, 1], end: [1, 4] })
  expect(offsetToLineColumn('foo', 3, 3)).toEqual({ start: [1, 4], end: [1, 4] })
  expect(offsetToLineColumn('foo\nbar', 4, 4)).toEqual({ start: [2, 1], end: [2, 1] })
  expect(offsetToLineColumn('foo\nbar\n', 2, 8)).toEqual({ start: [1, 3], end: [3, 1] })
})

test('lineColumnToOffset', () => {
  expect(lineColumnToOffset('foo', [1, 1])).toEqual({ from: 0, to: 0 })
  expect(lineColumnToOffset('foo', [1, 1], [1, 2])).toEqual({ from: 0, to: 1 })
  expect(lineColumnToOffset('foo', [1, 1], [1, 3])).toEqual({ from: 0, to: 2 })
  expect(lineColumnToOffset('foo', [1, 1], [1, 4])).toEqual({ from: 0, to: 3 })
  expect(lineColumnToOffset('foo', [1, 1], [1, 5])).toEqual({ from: 0, to: 3 })
  expect(lineColumnToOffset('foo', [1, 4])).toEqual({ from: 3, to: 3 })
  expect(lineColumnToOffset('foo\nbar', [2, 1])).toEqual({ from: 4, to: 4 })
  expect(lineColumnToOffset('foo\nbar\n', [1, 2], [4, 4])).toEqual({ from: 1, to: 8 })
  expect(
    lineColumnToOffset(
      `& {
    background: red;
    %blue {
      background: blue; }
    }
  }`,
      [6, 3],
      [6, 4],
    ),
  ).toEqual({ from: 71, to: 72 })
})
