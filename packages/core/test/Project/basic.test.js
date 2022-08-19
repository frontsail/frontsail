import { Project } from '../..'

const project = new Project({
  components: [
    { name: 'foo', html: '<div><include component="bar"></include></div>' },
    { name: 'bar', html: '<div><include asset="/assets/baz"></include></div>' },
    { name: 'baz', html: '<div><outlet></outlet><outlet name="baz"><span></span></outlet></div>' },
  ],
  pages: [
    { path: '/', html: '<h1>Hello, World!</h1>' },
    { path: '/foo', html: '<include component="foo"></include>' },
    { path: '/bar', html: '<include component="bar"></include>' },
  ],
  assets: ['/assets/baz'],
})

test('listing components', () => {
  expect(project.listComponents()).toEqual(['bar', 'baz', 'foo'])
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
  expect(project.getIncludedComponentNames('foo')).toEqual(['bar'])
  expect(project.getIncludedComponentNames('bar')).toEqual([])
  expect(project.getIncludedComponentNames('/')).toEqual([])
  expect(project.getIncludedComponentNames('/foo')).toEqual(['foo'])
  expect(project.getIncludedComponentNames('/bar')).toEqual(['bar'])
  expect(project.getIncludedComponentNames('foo', true)).toEqual(['bar'])
  expect(project.getIncludedComponentNames('bar', true)).toEqual([])
  expect(project.getIncludedComponentNames('/', true)).toEqual([])
  expect(project.getIncludedComponentNames('/foo', true)).toEqual(['bar', 'foo'])
  expect(project.getIncludedComponentNames('/bar', true)).toEqual(['bar'])
})

test('getting included assets', () => {
  expect(project.getIncludedAssetPaths('foo')).toEqual([])
  expect(project.getIncludedAssetPaths('bar')).toEqual(['/assets/baz'])
  expect(project.getIncludedAssetPaths('/')).toEqual([])
  expect(project.getIncludedAssetPaths('/foo')).toEqual([])
  expect(project.getIncludedAssetPaths('/bar')).toEqual([])
  expect(project.getIncludedAssetPaths('foo', true)).toEqual(['/assets/baz'])
  expect(project.getIncludedAssetPaths('bar', true)).toEqual(['/assets/baz'])
  expect(project.getIncludedAssetPaths('/', true)).toEqual([])
  expect(project.getIncludedAssetPaths('/foo', true)).toEqual(['/assets/baz'])
  expect(project.getIncludedAssetPaths('/bar', true)).toEqual(['/assets/baz'])
})

test('getting outlet names', () => {
  expect(project.getOutletNames('foo')).toEqual([])
  expect(project.getOutletNames('bar')).toEqual([])
  expect(project.getOutletNames('baz')).toEqual(['baz', 'main'])
  expect(() => project.getOutletNames('/')).toThrow()
})
