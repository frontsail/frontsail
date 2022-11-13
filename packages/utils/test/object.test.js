import { clearObject, fillObject, fillObjectDeep, isObject } from '../dist'

test('clearObject', () => {
  const baz = { foo: 'bar' }

  expect(clearObject(baz)).toEqual({})
  expect(baz.foo).toBe(undefined)
})

test('fillObject', () => {
  expect(fillObject({ foo: 'bar' }, { foo: 'baz', bar: 'baz' })).toEqual({ foo: 'bar', bar: 'baz' })
  expect(fillObject({ foo: 'bar' }, {})).toEqual({ foo: 'bar' })
})

test('fillObjectDeep', () => {
  expect(fillObjectDeep({ foo: { bar: 'baz' } }, { foo: { baz: 'qux' } })).toEqual({
    foo: { bar: 'baz', baz: 'qux' },
  })
  expect(fillObjectDeep({ foo: { bar: 'baz' } }, { foo: { bar: 'qux' } })).toEqual({
    foo: { bar: 'baz' },
  })
  expect(fillObjectDeep({ foo: 'bar' }, { foo: 'baz', bar: 'baz' })).toEqual({
    foo: 'bar',
    bar: 'baz',
  })
  expect(fillObjectDeep({ foo: undefined }, { bar: {}, baz: { qux: [] }, qux: null })).toEqual({
    foo: undefined,
    bar: {},
    baz: { qux: [] },
    qux: null,
  })
  expect(fillObjectDeep({ foo: 'bar' }, {})).toEqual({ foo: 'bar' })
})

test('isObject', () => {
  expect(isObject({})).toBe(true)
  expect(isObject([])).toBe(false)
  expect(isObject(null)).toBe(false)
  expect(isObject(1)).toBe(false)
  expect(isObject('foo')).toBe(false)
  expect(isObject(true)).toBe(false)
  expect(isObject(false)).toBe(false)
  expect(isObject(undefined)).toBe(false)
})
