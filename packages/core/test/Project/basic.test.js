import { Project } from '../..'

const project = new Project({
  components: [
    { name: 'foo', html: '<div><include component="bar" /></div>' },
    { name: 'bar', html: '<span>bar</span>' },
  ],
  pages: [
    { path: '/', html: '<h1>Hello, World!</h1>' },
    { path: '/foo', html: '<include component="foo" />' },
    { path: '/bar', html: '<include component="bar" />' },
  ],
})

test('listing components', () => {
  expect(project.listComponents()).toEqual(['bar', 'foo'])
})

test('listing pages', () => {
  expect(project.listPages()).toEqual(['/', '/bar', '/foo'])
})

test('adding component with invalid name', () => {
  expect(() => project.addComponent('foo_bar', '')).toThrow()
})

test('adding page with invalid path', () => {
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
  expect(project.getIncludedComponentsInTemplate('foo')).toEqual(['bar'])
  expect(project.getIncludedComponentsInTemplate('bar')).toEqual([])
  expect(project.getIncludedComponentsInTemplate('/')).toEqual([])
  expect(project.getIncludedComponentsInTemplate('/foo')).toEqual(['bar', 'foo'])
  expect(project.getIncludedComponentsInTemplate('/bar')).toEqual(['bar'])
})
