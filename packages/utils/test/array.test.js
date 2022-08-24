import { clearArray, compareArrays, diffArrays, intersectArrays, last, uniqueArray } from '..'

test('clearArray', () => {
  const bar = ['foo']

  expect(clearArray(bar)).toEqual([])
  expect(bar[0]).toBe(undefined)
})

test('compareArrays', () => {
  expect(compareArrays(['foo', 'foo', 'bar'], ['bar', 'foo'])).toBe(true)
  expect(compareArrays(['foo'], ['bar'])).toBe(false)
  expect(compareArrays([{}], [{}])).toBe(false)
})

test('diffArrays', () => {
  expect(diffArrays(['foo'], ['bar', 'bar'])).toEqual(['foo', 'bar'])
  expect(diffArrays(['foo'], ['foo', 'bar'])).toEqual(['bar'])
  expect(diffArrays([{}], [{}])).toEqual([{}, {}])
})

test('intersectArrays', () => {
  expect(intersectArrays(['foo', 'foo', 'bar'], ['foo', 'foo'])).toEqual(['foo'])
  expect(intersectArrays(['foo'], ['bar'])).toEqual([])
  expect(intersectArrays([{}], [{}])).toEqual([])
})

test('last', () => {
  expect(last(['foo', 'bar', 'baz'])).toEqual('baz')
  expect(last(['foo', 'foo'])).toEqual('foo')
  expect(last([])).toEqual(undefined)
})

test('uniqueArray', () => {
  expect(uniqueArray(['foo', 'foo', 'bar'])).toEqual(['foo', 'bar'])
  expect(uniqueArray(['foo'])).toEqual(['foo'])
  expect(uniqueArray([{}, {}])).toEqual([{}, {}])
})
