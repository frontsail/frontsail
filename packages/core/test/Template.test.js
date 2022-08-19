import { Template } from '..'

test('extracting dependencies', () => {
  const helper = (html) => {
    const t = new Template('', html)
    return { a: t.getIncludedAssetPaths(), c: t.getIncludedComponentNames() }
  }

  expect(helper('<include asset="/assets/foo"></include>').a).toEqual(['/assets/foo'])
  expect(helper('<include component="foo"></include>').c).toEqual(['foo'])
  expect(helper('<include asset="/assets/foo" component="bar"></include>').a).toEqual([
    '/assets/foo',
  ])
  expect(helper('<include asset="/assets/foo" component="bar"></include>').c).toEqual(['bar'])
  expect(helper('<include></include>').a).toHaveLength(0)
})
