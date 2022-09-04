import { Project } from '../..'

const project = new Project({
  environment: 'development',
  components: [
    { name: 'foo', html: '<div><include component="bar"></include></div>' },
    { name: 'bar', html: '<div><include component="baz"></include></div>' },
    { name: 'baz', html: '<div><outlet></outlet><outlet name="baz"><span></span></outlet></div>' },
    {
      name: 'alpine',
      html: `<div x-data="{ count: foo, increment() { this.count++ } }" @click="increment()"><span x-text="count" :data-foo="foo" x-cloak></span></div>`,
    },
  ],
  pages: [
    { path: '/', html: '<h1>Hello, World!</h1>' },
    { path: '/foo', html: '<include component="foo"></include>' },
    { path: '/bar', html: '<include component="bar"></include>' },
  ],
  assets: ['/assets/baz'],
  js: "const foo = 'bar'",
})

test('listing components', () => {
  expect(project.listComponents()).toEqual(['alpine', 'bar', 'baz', 'foo'])
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
  expect(project.lintComponent('alpine', '*').getComponentDiagnostics('alpine', '*')).toHaveLength(
    0,
  )
  expect(project.lintPage('/', '*').getPageDiagnostics('/', '*')).toHaveLength(0)
  expect(project.lintPage('/foo', '*').getPageDiagnostics('/foo', '*')).toHaveLength(0)
  expect(project.lintPage('/bar', '*').getPageDiagnostics('/bar', '*')).toHaveLength(0)
})

test('indices', () => {
  expect(project.getComponentIndex('foo')).toBe(1)
  expect(project.getComponentIndex('bar')).toBe(2)
  expect(project.getComponentIndex('baz')).toBe(3)
  expect(project.getComponentIndex('alpine')).toBe(4)
  expect(project.getPageIndex('/')).toBe(1)
  expect(project.getPageIndex('/foo')).toBe(2)
  expect(project.getPageIndex('/bar')).toBe(3)
})

test('getting included components', () => {
  expect(project.getIncludedComponentNames('foo')).toEqual(['bar'])
  expect(project.getIncludedComponentNames('bar')).toEqual(['baz'])
  expect(project.getIncludedComponentNames('baz')).toEqual([])
  expect(project.getIncludedComponentNames('alpine')).toEqual([])
  expect(project.getIncludedComponentNames('/')).toEqual([])
  expect(project.getIncludedComponentNames('/foo')).toEqual(['foo'])
  expect(project.getIncludedComponentNames('/bar')).toEqual(['bar'])
  expect(project.getIncludedComponentNames('foo', true)).toEqual(['bar', 'baz'])
  expect(project.getIncludedComponentNames('bar', true)).toEqual(['baz'])
  expect(project.getIncludedComponentNames('baz', true)).toEqual([])
  expect(project.getIncludedComponentNames('alpine', true)).toEqual([])
  expect(project.getIncludedComponentNames('/', true)).toEqual([])
  expect(project.getIncludedComponentNames('/foo', true)).toEqual(['bar', 'baz', 'foo'])
  expect(project.getIncludedComponentNames('/bar', true)).toEqual(['bar', 'baz'])
})

test('getting outlet names', () => {
  expect(project.getOutletNames('foo')).toEqual([])
  expect(project.getOutletNames('bar')).toEqual([])
  expect(project.getOutletNames('baz')).toEqual(['main', 'baz'])
  expect(project.getOutletNames('alpine')).toEqual([])
  expect(() => project.getOutletNames('/')).toThrow()
})

test('setting globals', () => {
  expect(project.setGlobals({ $foo: 'bar' })).toBe(project)
  expect(() => project.setGlobals({ bar: 'baz' })).toThrow()
  expect(project.getGlobals()).toEqual({ $foo: 'bar' })
})

test('building scripts (1)', () => {
  expect(project.buildScripts()).toBe(
    [
      "const foo = 'bar'",
      "document.addEventListener('alpine:init', () => {",
      "  Alpine.data('_c4_D', () => ({ count: foo, increment() { this.count++ },",
      '    _c4b1_D: {',
      "      '@click'() {",
      '        return this.increment()',
      '      }',
      '    },',
      '    _c4b2_D: {',
      "      'x-text'() {",
      '        return this.count',
      '      },',
      "      ':data-foo'() {",
      '        return foo',
      '      }',
      '    }',
      '  }))',
      '})',
    ].join('\n'),
  )
})

test('building scripts (2)', () => {
  const project = new Project({
    components: [
      {
        name: 'foo',
        html: `<button x-data="{ init() { const foo = 'bar' } }" @click="bar()"></button>`,
      },
    ],
    js: "function bar() { const baz = 'baz'; console.log(`foo-bar-${baz}`) }",
  })

  expect(project.buildScripts()).toBe(
    [
      "function bar() { const baz = 'baz'; console.log(`foo-bar-${baz}`) }",
      "document.addEventListener('alpine:init', () => {",
      "  Alpine.data('_c1_D', () => ({ init() { const foo = 'bar' },",
      '    _c1b1_D: {',
      "      '@click'() {",
      '        return bar()',
      '      }',
      '    }',
      '  }))',
      '})',
    ].join('\n'),
  )
})
