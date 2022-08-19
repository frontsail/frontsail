import { clearObject, fillObject } from '..'

test('clearObject', () => {
  const baz = { foo: 'bar' }

  expect(clearObject(baz)).toEqual({})
  expect(baz.foo).toBe(undefined)
})

test('fillObject', () => {
  expect(fillObject({ foo: 'bar' }, { foo: 'baz', bar: 'baz' })).toEqual({ foo: 'bar', bar: 'baz' })
  expect(fillObject({ foo: 'bar' }, {})).toEqual({ foo: 'bar' })
})
