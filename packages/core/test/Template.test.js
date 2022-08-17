import { Template } from '..'

test('extracting dependencies', () => {
  const helper = (html) => {
    const t = new Template('', html)
    return { a: t.getIncludedAssetPaths(), c: t.getIncludedComponentNames() }
  }

  expect(helper('<include asset="/assets/foo" />').a).toEqual(['/assets/foo'])
  expect(helper('<include component="foo" />').c).toEqual(['foo'])
  expect(helper('<include asset="/assets/foo" component="bar" />').a).toEqual(['/assets/foo'])
  expect(helper('<include asset="/assets/foo" component="bar" />').c).toEqual(['bar'])
  expect(helper('<include />').a).toHaveLength(0)
})
