import { Project } from '../..'

test('empty project', () => {
  expect(new Project().buildStyles()).toBe('')
})

test('with one component', () => {
  const project = new Project({
    environment: 'development',
    components: [{ name: 'foo', html: '<div css="{ display: block }"></div>' }],
  })

  expect(project.buildStyles()).toBe('._foo__e1_D {\n  display: block\n}')
})

test('with media queries and global variables', () => {
  const project = new Project({
    environment: 'development',
    components: [{ name: 'foo/bar', html: '<div css="{ @sm { color: $primary } }"></div>' }],
    globals: { $sm: '(max-width: 767px)', $primary: '#000' },
  })

  expect(project.buildStyles()).toBe(
    '@media (max-width: 767px) {\n  ._foo\\/bar__e1_D {\n    color: #000\n  }\n}',
  )
})

test('in production mode', () => {
  const project = new Project({
    css: 'body { margin: 0 }',
    components: [
      { name: 'foo', html: '<div css="{ display: block; %baz { display: grid } }"></div>' },
      {
        name: 'bar',
        html: '<div css="{ display: none; %qux { display: flex } }" class="bar"></div>',
      },
    ],
  })

  expect(project.buildStyles()).toBe(
    [
      'body{margin:0}',
      '._c2e1_D{display:none}',
      '._c2e1_qux_D{display:flex}',
      '._c1e1_D{display:block}',
      '._c1e1_baz_D{display:grid}',
    ].join(''),
  )

  expect(project.render('foo').html).toBe('<div class="_c1e1_D"></div>')
  expect(project.render('bar').html).toBe('<div class="_c2e1_D bar"></div>')
})

test('linting', () => {
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
