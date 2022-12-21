import {
  clearArray,
  compareArrays,
  diffArrays,
  intersectArrays,
  last,
  nth,
  nthIndex,
  uniqueArray,
} from '../dist'

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

test('nth', () => {
  expect(nth(['foo', 'bar'], 2)).toEqual('foo')
  expect(nth(['foo', 'bar'], 0)).toEqual('foo')
  expect(nth(['foo', 'bar'], 1)).toEqual('bar')
  expect(nth(['foo', 'bar'], -1)).toEqual('bar')
  expect(nth(['foo'], 2)).toEqual('foo')
  expect(nth([], 1)).toEqual(undefined)
})

test('nthIndex', () => {
  expect(nthIndex(['foo', 'bar'], 2)).toEqual(0)
  expect(nthIndex(['foo', 'bar'], 0)).toEqual(0)
  expect(nthIndex(['foo', 'bar'], 1)).toEqual(1)
  expect(nthIndex(['foo', 'bar'], -1)).toEqual(1)
  expect(nthIndex(['foo'], 2)).toEqual(0)
  expect(nthIndex([], 1)).toEqual(NaN)
})

test('uniqueArray', () => {
  expect(uniqueArray(['foo', 'foo', 'bar'])).toEqual(['foo', 'bar'])
  expect(uniqueArray(['foo'])).toEqual(['foo'])
  expect(uniqueArray([{}, {}])).toEqual([{}, {}])
})
