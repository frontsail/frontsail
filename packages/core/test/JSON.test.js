import { JSON } from '..'

test('initialization', () => {
  expect(new JSON('"foo"').hasProblems('*')).toBe(false)
  expect(new JSON('null').hasProblems('*')).toBe(false)
  expect(new JSON('0').hasProblems('*')).toBe(false)
  expect(new JSON('{}').hasProblems('*')).toBe(false)
  expect(new JSON('[]').hasProblems('*')).toBe(false)
  expect(new JSON('foo').hasProblems('*')).toBe(true)
  expect(new JSON('{ "foo": "bar" }').getNodes()).toHaveLength(2)
})

test('extracting property nodes', () => {
  expect(new JSON('{ "foo": 1, "bar": 2, "baz": 3 }').getPropertyNodes()).toHaveLength(3)
  expect(new JSON('{ "foo": 1, "bar": { "baz": 2 } }').getPropertyNodes()).toHaveLength(2)
  expect(new JSON('{}').getPropertyNodes()).toHaveLength(0)
  expect(() => new JSON('"foo""').getPropertyNodes()).toThrow()
  expect(() => new JSON('null').getPropertyNodes()).toThrow()
})
