import { Project } from '../..'

test('linting custom styles (1)', () => {
  const project = new Project({
    css: '.foo { display: block; @sm { display: none } &--bar { display: grid } &.baz { display: $baz } %qux { display: inline } }',
    globals: { $sm: '(max-width: 767px)' },
  })
  const diagnostics = project.lintCustomCSS('*').getCustomCSSDiagnostics('*')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 87)
  expect(diagnostics).toHaveProperty('0.to', 91)
  expect(diagnostics).toHaveProperty('0.message', 'Global variable does not exist.')
  expect(diagnostics).toHaveProperty('1.from', 94)
  expect(diagnostics).toHaveProperty('1.to', 98)
  expect(diagnostics).toHaveProperty('1.message', 'Modifiers can only be used in components.')
  expect(project.buildStyles()).toBe(
    '.foo{display:block}.foo--bar{display:grid}.foo.baz{display:$baz}%qux{display:inline}@media (max-width: 767px){.foo{display:none}}',
  )
  expect(project.setEnvironment('development').buildStyles()).toBe(
    [
      '.foo {',
      '  display: block',
      '}',
      '.foo--bar {',
      '  display: grid',
      '}',
      '.foo.baz {',
      '  display: $baz',
      '}',
      '%qux {',
      '  display: inline',
      '}',
      '@media (max-width: 767px) {',
      '  .foo {',
      '    display: none',
      '  }',
      '}',
    ].join('\n'),
  )
})

test('linting custom styles (2)', () => {
  const diagnostics = new Project({
    components: [
      { name: 'foo', html: '<div css="{ foo: $foo, %bar { @bar { baz: $baz; } } }"></div>' },
    ],
    globals: { $foo: 'bar' },
  })
    .lintComponent('foo', 'inlineCSS')
    .getComponentDiagnostics('foo', 'inlineCSS')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 30)
  expect(diagnostics).toHaveProperty('0.to', 34)
  expect(diagnostics).toHaveProperty('0.message', 'Global variable does not exist.')
  expect(diagnostics).toHaveProperty('1.from', 42)
  expect(diagnostics).toHaveProperty('1.to', 46)
  expect(diagnostics).toHaveProperty('1.message', 'Global variable does not exist.')
})
