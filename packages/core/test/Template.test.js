import { Template } from '..'

test('extracting dependencies', () => {
  const helper = (html) => {
    const t = new Template('', html)
    return t.getIncludedComponentNames()
  }

  expect(helper('<include component="foo"></include>')).toEqual(['foo'])
  expect(helper('<include foo="bar" component="bar"></include>')).toEqual(['bar'])
  expect(helper('<include></include>')).toEqual([])
})
