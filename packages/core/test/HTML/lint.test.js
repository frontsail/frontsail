import { HTML } from '../..'

test('linting alpine directives', () => {
  const diagnostics = new HTML('<div x-data="foo" @click="-" x-cloak></div>')
    .lint('alpineDirectives')
    .getDiagnostics('alpineDirectives')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 13)
  expect(diagnostics).toHaveProperty('0.to', 16)
  expect(diagnostics).toHaveProperty('0.message', 'Alpine data must be an object.')
  expect(diagnostics).toHaveProperty('1.from', 27)
  expect(diagnostics).toHaveProperty('1.to', 27)
  expect(diagnostics).toHaveProperty('1.message', 'Unexpected token.')
})

test('linting attribute names', () => {
  const diagnostics = new HTML('<div {{ foo }} bar_baz></div>')
    .lint('attributeNames')
    .getDiagnostics('attributeNames')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 5)
  expect(diagnostics).toHaveProperty('0.to', 7)
  expect(diagnostics).toHaveProperty(
    '0.message',
    'Mustache syntax is not allowed in attribute names.',
  )
  expect(diagnostics).toHaveProperty('1.from', 12)
  expect(diagnostics).toHaveProperty('1.to', 14)
  expect(diagnostics).toHaveProperty(
    '1.message',
    'Mustache syntax is not allowed in attribute names.',
  )
  expect(diagnostics).toHaveProperty('2.from', 15)
  expect(diagnostics).toHaveProperty('2.to', 22)
  expect(diagnostics[2].message).toBe('Invalid attribute name.')
})

test('linting if attributes', () => {
  const diagnostics = new HTML('<div if="+foo"><slot if="bar()"></slot></div>')
    .lint('ifAttributes')
    .getDiagnostics('ifAttributes')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 21)
  expect(diagnostics).toHaveProperty('0.to', 23)
  expect(diagnostics).toHaveProperty('0.message', 'If statements cannot be used in slots.')
  expect(diagnostics).toHaveProperty('1.from', 25)
  expect(diagnostics).toHaveProperty('1.to', 30)
  expect(diagnostics).toHaveProperty(
    '1.message',
    'Call expressions and declarations are not allowed.',
  )
})

test('linting include elements (1)', () => {
  const diagnostics = new HTML('<include if="foo" bar="baz" data-baz />')
    .lint('includeElements')
    .getDiagnostics('includeElements')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 28)
  expect(diagnostics).toHaveProperty('0.to', 36)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid property name format.')
  expect(diagnostics).toHaveProperty('1.from', 0)
  expect(diagnostics).toHaveProperty('1.to', 39)
  expect(diagnostics).toHaveProperty('1.message', "Missing attribute 'asset' or 'component'.")
})

test('linting include elements (2)', () => {
  const diagnostics = new HTML('<include component="/foo" asset="bar" />')
    .lint('includeElements')
    .getDiagnostics('includeElements')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 20)
  expect(diagnostics).toHaveProperty('0.to', 24)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid component name format.')
  expect(diagnostics).toHaveProperty('1.from', 0)
  expect(diagnostics).toHaveProperty('1.to', 40)
  expect(diagnostics).toHaveProperty(
    '1.message',
    'Assets and componets cannot be included at the same time.',
  )
  expect(diagnostics).toHaveProperty('2.from', 33)
  expect(diagnostics).toHaveProperty('2.to', 36)
  expect(diagnostics[2].message).toBe('Invalid asset path format.')
})

test('linting include elements (3)', () => {
  const diagnostics = new HTML('<include if="foo" asset="/assets/bar" baz>')
    .lint('includeElements')
    .getDiagnostics('includeElements')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 38)
  expect(diagnostics).toHaveProperty('0.to', 41)
  expect(diagnostics).toHaveProperty(
    '0.message',
    'Properties cannot be used when including an asset.',
  )
})

test('linting mustache locations', () => {
  const diagnostics = new HTML('<div foo="{{ bar }}" :bar="{{ BAZ }}">{{ fooBar }}</div>')
    .lint('mustacheLocations')
    .getDiagnostics('mustacheLocations')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 27)
  expect(diagnostics).toHaveProperty('0.to', 36)
  expect(diagnostics).toHaveProperty('0.message', 'Mustaches cannot be used in Alpine directives.')
})

test('linting mustache values', () => {
  const diagnostics = new HTML('<div foo="{{ bar }}" :bar="{{ BAZ }}">{{ fooBar }}</div>')
    .lint('mustacheValues')
    .getDiagnostics('mustacheValues')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 41)
  expect(diagnostics).toHaveProperty('0.to', 47)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid variable name.')
})
