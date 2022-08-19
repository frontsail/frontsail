import { clearArray, compareArrays, diffArrays, intersectArrays, uniqueArray } from '..'

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

test('uniqueArray', () => {
  expect(uniqueArray(['foo', 'foo', 'bar'])).toEqual(['foo', 'bar'])
  expect(uniqueArray(['foo'])).toEqual(['foo'])
  expect(uniqueArray([{}, {}])).toEqual([{}, {}])
})
