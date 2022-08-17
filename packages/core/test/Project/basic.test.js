import { Project } from '../..'

const project = new Project({
  components: [
    { name: 'foo', html: '<div><include component="bar" /></div>' },
    { name: 'bar', html: '<include asset="/assets/baz" />' },
  ],
  pages: [
    { path: '/', html: '<h1>Hello, World!</h1>' },
    { path: '/foo', html: '<include component="foo" />' },
    { path: '/bar', html: '<include component="bar" />' },
  ],
  assets: ['/assets/baz'],
})

test('listing components', () => {
  expect(project.listComponents()).toEqual(['bar', 'foo'])
})

test('listing pages', () => {
  expect(project.listPages()).toEqual(['/', '/bar', '/foo'])
})

test('listing assets', () => {
  expect(project.listAssets()).toEqual(['/assets/baz'])
})

test('adding component with invalid name', () => {
  expect(() => project.addComponent('foo_bar', '')).toThrow()
})

test('adding page with invalid path', () => {
  expect(() => project.addPage('foo_bar', '')).toThrow()
})

test('adding asset with invalid path', () => {
  expect(() => project.addPage('foo_bar', '')).toThrow()
})

test('linting', () => {
  expect(project.lintComponent('foo', '*').getComponentDiagnostics('foo', '*')).toHaveLength(0)
  expect(project.lintComponent('bar', '*').getComponentDiagnostics('bar', '*')).toHaveLength(0)
  expect(project.lintPage('/', '*').getPageDiagnostics('/', '*')).toHaveLength(0)
  expect(project.lintPage('/foo', '*').getPageDiagnostics('/foo', '*')).toHaveLength(0)
  expect(project.lintPage('/bar', '*').getPageDiagnostics('/bar', '*')).toHaveLength(0)
})

test('getting included components', () => {
  expect(project.getIncludedComponentNamesInTemplate('foo', true)).toEqual(['bar'])
  expect(project.getIncludedComponentNamesInTemplate('bar', true)).toEqual([])
  expect(project.getIncludedComponentNamesInTemplate('/', true)).toEqual([])
  expect(project.getIncludedComponentNamesInTemplate('/foo', true)).toEqual(['bar', 'foo'])
  expect(project.getIncludedComponentNamesInTemplate('/bar', true)).toEqual(['bar'])
})

test('getting included assets', () => {
  expect(project.getIncludedAssetPathsInTemplate('foo', true)).toEqual(['/assets/baz'])
  expect(project.getIncludedAssetPathsInTemplate('bar', true)).toEqual(['/assets/baz'])
  expect(project.getIncludedAssetPathsInTemplate('/', true)).toEqual([])
  expect(project.getIncludedAssetPathsInTemplate('/foo', true)).toEqual(['/assets/baz'])
  expect(project.getIncludedAssetPathsInTemplate('/bar', true)).toEqual(['/assets/baz'])
})
