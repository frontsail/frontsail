import { CSS } from '../..'

test('initialization', () => {
  expect(new CSS('.foo {}').hasProblems('*')).toBe(false)
  expect(new CSS('% {}').hasProblems('*')).toBe(false)
  expect(new CSS('& {}').hasProblems('*')).toBe(false)
  expect(new CSS('&').hasProblems('*')).toBe(true)
})

test('extract global variables (1)', () => {
  const variables = new CSS('.foo { display: $display }').getGlobals()

  expect(variables).toHaveLength(1)
  expect(variables).toHaveProperty('0.text', '$display')
  expect(variables).toHaveProperty('0.variable', '$display')
  expect(variables).toHaveProperty('0.from', 16)
  expect(variables).toHaveProperty('0.to', 24)
})

test('extract global variables (2)', () => {
  const variables = new CSS('@foo { display: $display; not: $media }').getGlobals()

  expect(variables).toHaveLength(2)
  expect(variables).toHaveProperty('0.text', '@foo')
  expect(variables).toHaveProperty('0.variable', '$foo')
  expect(variables).toHaveProperty('0.from', 0)
  expect(variables).toHaveProperty('0.to', 4)
  expect(variables).toHaveProperty('1.text', '$display')
  expect(variables).toHaveProperty('1.variable', '$display')
  expect(variables).toHaveProperty('1.from', 16)
  expect(variables).toHaveProperty('1.to', 24)
})

test('building', () => {
  expect(new CSS('.foo { display: block }').build()).toBe('.foo {\n  display: block\n}')

  expect(new CSS('&--foo { display: block; color: $primary }').build()).toBe(
    '&--foo {\n  display: block;\n  color: $primary\n}',
  )

  expect(new CSS('%foo { display: block; color: $primary }').build()).toBe(
    '%foo {\n  display: block;\n  color: $primary\n}',
  )

  expect(new CSS('.foo { &--bar { display: block } }').build()).toBe(
    '.foo--bar {\n  display: block\n}',
  )

  expect(new CSS('.foo { %bar { display: block } }').build()).toBe('%bar {\n  display: block\n}')

  expect(new CSS('.foo { &--bar.baz { display: block } }').build()).toBe(
    '.foo--bar.baz {\n  display: block\n}',
  )

  expect(new CSS('.foo { .bar { display: block } }').build()).toBe(
    '.foo .bar {\n  display: block\n}',
  )

  expect(new CSS('.foo { display: none; &--bar { display: block } }').build()).toBe(
    '.foo {\n  display: none\n}\n.foo--bar {\n  display: block\n}',
  )

  expect(new CSS('.foo { @sm { display: block } }').build()).toBe(
    '@media $sm {\n  .foo {\n    display: block\n  }\n}',
  )

  expect(new CSS('.foo { display: none; @sm { display: block } }').build()).toBe(
    '.foo {\n  display: none\n}\n@media $sm {\n  .foo {\n    display: block\n  }\n}',
  )

  expect(new CSS('%foo { display: none; @sm { display: block } }').build()).toBe(
    '%foo {\n  display: none\n}\n@media $sm {\n  %foo {\n    display: block\n  }\n}',
  )

  expect(new CSS('.foo { .bar { @sm { display:block; } } }').build()).toBe(
    '@media $sm {\n  .foo .bar {\n    display: block\n  }\n}',
  )

  expect(new CSS('.foo { &--bar%baz { @sm { display:block; } } }').build()).toBe(
    '@media $sm {\n  .foo--bar%baz {\n    display: block\n  }\n}',
  )
})

test('sorting and merging media queries', () => {
  expect(new CSS('.foo { @sm { display: block } @sm { display: none } }').build()).toBe(
    '@media $sm {\n  .foo {\n    display: block\n  }\n  .foo {\n    display: none\n  }\n}',
  )

  expect(
    new CSS('.foo { @md { display: block } @sm { display: none } }').build(['$sm', '$md']),
  ).toBe(
    '@media $sm {\n  .foo {\n    display: none\n  }\n}\n@media $md {\n  .foo {\n    display: block\n  }\n}',
  )
})
