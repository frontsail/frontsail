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
  expect(diagnostics).toHaveProperty('2.message', 'Invalid attribute name.')
})

test('linting if attributes (1)', () => {
  const diagnostics = new HTML('<div if="+foo()"><outlet if="bar()"></outlet></div>')
    .lint('ifAttributes')
    .getDiagnostics('ifAttributes')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 9)
  expect(diagnostics).toHaveProperty('0.to', 15)
  expect(diagnostics).toHaveProperty(
    '0.message',
    'Call expressions and declarations are not allowed.',
  )
})

test('linting if attributes (2)', () => {
  const diagnostics = new HTML('<div if><inject if=""></inject><outlet if></outlet></div>')
    .lint('ifAttributes')
    .getDiagnostics('ifAttributes')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 5)
  expect(diagnostics).toHaveProperty('0.to', 7)
  expect(diagnostics).toHaveProperty('0.message', 'Empty if statement.')
  expect(diagnostics).toHaveProperty('1.from', 16)
  expect(diagnostics).toHaveProperty('1.to', 18)
  expect(diagnostics).toHaveProperty('1.message', 'Empty if statement.')
})

test('linting include elements (1)', () => {
  const diagnostics = new HTML('<include if="foo" bar="baz" data-baz></include>')
    .lint('includeElements')
    .getDiagnostics('includeElements')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 28)
  expect(diagnostics).toHaveProperty('0.to', 36)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid property name.')
  expect(diagnostics).toHaveProperty('1.from', 0)
  expect(diagnostics).toHaveProperty('1.to', 37)
  expect(diagnostics).toHaveProperty('1.message', "Missing 'component' attribute.")
})

test('linting include elements (2)', () => {
  const diagnostics = new HTML('<include component="/foo" bar-baz="baz"></include>')
    .lint('includeElements')
    .getDiagnostics('includeElements')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 20)
  expect(diagnostics).toHaveProperty('0.to', 24)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid component name.')
  expect(diagnostics).toHaveProperty('1.from', 26)
  expect(diagnostics).toHaveProperty('1.to', 33)
  expect(diagnostics).toHaveProperty('1.message', 'Invalid property name.')
})

test('linting include elements (3)', () => {
  const diagnostics = new HTML('<include if into component="foo"></include>')
    .lint('includeElements')
    .getDiagnostics('includeElements')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 12)
  expect(diagnostics).toHaveProperty('0.to', 16)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid property name.')
})

test('linting inject elements (1)', () => {
  const diagnostics = new HTML('<inject if="+foo" into="bar" baz></inject>')
    .lint('injectElements')
    .getDiagnostics('injectElements')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 0)
  expect(diagnostics).toHaveProperty('0.to', 42)
  expect(diagnostics).toHaveProperty(
    '0.message',
    "Inject tags must be directly nested within 'include' elements.",
  )
  expect(diagnostics).toHaveProperty('1.from', 29)
  expect(diagnostics).toHaveProperty('1.to', 32)
  expect(diagnostics).toHaveProperty('1.message', 'Unsupported attribute.')
})

test('linting inject elements (2)', () => {
  const diagnostics = new HTML(
    '<include><inject></inject><inject into="foo"></inject><inject into="main"></inject><inject into=""></inject></include>',
  )
    .lint('injectElements')
    .getDiagnostics('injectElements')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 9)
  expect(diagnostics).toHaveProperty('0.to', 17)
  expect(diagnostics).toHaveProperty('0.message', 'Duplicate injection.')
  expect(diagnostics).toHaveProperty('1.from', 68)
  expect(diagnostics).toHaveProperty('1.to', 72)
  expect(diagnostics).toHaveProperty('1.message', 'Duplicate injection.')
  expect(diagnostics).toHaveProperty('2.from', 91)
  expect(diagnostics).toHaveProperty('2.to', 95)
  expect(diagnostics).toHaveProperty('2.message', 'Missing outlet name.')
})

test('linting inject elements (3)', () => {
  const diagnostics = new HTML('<include><inject></inject> <div></div> foo</include>')
    .lint('injectElements')
    .getDiagnostics('injectElements')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 27)
  expect(diagnostics).toHaveProperty('0.to', 38)
  expect(diagnostics).toHaveProperty(
    '0.message',
    'When using inject tags, all other nodes must be nested inside them.',
  )
  expect(diagnostics).toHaveProperty('1.from', 38)
  expect(diagnostics).toHaveProperty('1.to', 42)
  expect(diagnostics).toHaveProperty(
    '1.message',
    'When using inject tags, all other nodes must be nested inside them.',
  )
})

test('linting inject elements (4)', () => {
  const diagnostics = new HTML('<include><inject if foo></inject></include>')
    .lint('injectElements')
    .getDiagnostics('injectElements')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 20)
  expect(diagnostics).toHaveProperty('0.to', 23)
  expect(diagnostics).toHaveProperty('0.message', 'Unsupported attribute.')
})

test('linting mustache locations (1)', () => {
  const diagnostics = new HTML('<div foo="{{ bar }}" :bar="{{ BAZ }}">{{ fooBar }}</div>')
    .lint('mustacheLocations')
    .getDiagnostics('mustacheLocations')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 27)
  expect(diagnostics).toHaveProperty('0.to', 36)
  expect(diagnostics).toHaveProperty('0.message', 'Mustaches cannot be used in Alpine directives.')
})

test('linting mustache locations (2)', () => {
  const diagnostics = new HTML('<include if="+{{ foo }}" component="bar/{{baz}}"></include>')
    .lint('mustacheLocations')
    .getDiagnostics('mustacheLocations')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 14)
  expect(diagnostics).toHaveProperty('0.to', 23)
  expect(diagnostics).toHaveProperty('0.message', "Mustaches cannot be used in 'if' attributes.")
  expect(diagnostics).toHaveProperty('1.from', 40)
  expect(diagnostics).toHaveProperty('1.to', 47)
  expect(diagnostics).toHaveProperty(
    '1.message',
    "Mustaches cannot be used in 'component' attributes.",
  )
})

test('linting mustache locations (3)', () => {
  const diagnostics = new HTML('<inject into="{{ foo }}" bar="{{ baz }}"></inject>')
    .lint('mustacheLocations')
    .getDiagnostics('mustacheLocations')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 14)
  expect(diagnostics).toHaveProperty('0.to', 23)
  expect(diagnostics).toHaveProperty('0.message', "Mustaches cannot be used in 'into' attributes.")
})

test('linting mustache locations (4)', () => {
  const diagnostics = new HTML('<outlet name="{{ foo }}" allow="bar,{{ baz }}"></outlet>')
    .lint('mustacheLocations')
    .getDiagnostics('mustacheLocations')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 14)
  expect(diagnostics).toHaveProperty('0.to', 23)
  expect(diagnostics).toHaveProperty('0.message', "Mustaches cannot be used in 'name' attributes.")
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

test('linting outlet elements (1)', () => {
  const diagnostics = new HTML(
    '<outlet></outlet><outlet name="foo"></outlet><outlet name="main"></outlet><outlet name=""></outlet>',
  )
    .lint('outletElements')
    .getDiagnostics('outletElements')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 0)
  expect(diagnostics).toHaveProperty('0.to', 8)
  expect(diagnostics).toHaveProperty('0.message', 'Duplicate outlet name.')
  expect(diagnostics).toHaveProperty('1.from', 59)
  expect(diagnostics).toHaveProperty('1.to', 63)
  expect(diagnostics).toHaveProperty('1.message', 'Duplicate outlet name.')
  expect(diagnostics).toHaveProperty('2.from', 82)
  expect(diagnostics).toHaveProperty('2.to', 86)
  expect(diagnostics).toHaveProperty('2.message', 'Missing outlet name.')
})

test('linting outlet elements (2)', () => {
  const diagnostics = new HTML('<outlet><outlet></outlet></outlet>')
    .lint('outletElements')
    .getDiagnostics('outletElements')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 0)
  expect(diagnostics).toHaveProperty('0.to', 8)
  expect(diagnostics).toHaveProperty('0.message', 'Duplicate outlet name.')
  expect(diagnostics).toHaveProperty('1.from', 8)
  expect(diagnostics).toHaveProperty('1.to', 16)
  expect(diagnostics).toHaveProperty('1.message', 'Duplicate outlet name.')
  expect(diagnostics).toHaveProperty('2.from', 8)
  expect(diagnostics).toHaveProperty('2.to', 25)
  expect(diagnostics).toHaveProperty('2.message', 'Outlets cannot be nested within each other.')
})

test('linting outlet elements (3)', () => {
  const diagnostics = new HTML('<include><outlet allow="foo,Bar" baz></outlet></include>')
    .lint('outletElements')
    .getDiagnostics('outletElements')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 9)
  expect(diagnostics).toHaveProperty('0.to', 46)
  expect(diagnostics).toHaveProperty(
    '0.message',
    "Outlets cannot be nested within 'include' elements.",
  )
  expect(diagnostics).toHaveProperty('1.from', 17)
  expect(diagnostics).toHaveProperty('1.to', 22)
  expect(diagnostics).toHaveProperty('1.message', 'Unsupported attribute.')
  expect(diagnostics).toHaveProperty('2.from', 33)
  expect(diagnostics).toHaveProperty('2.to', 36)
  expect(diagnostics).toHaveProperty('2.message', 'Unsupported attribute.')
})

test('linting outlet elements (4)', () => {
  const diagnostics = new HTML('<outlet if into foo></outlet>')
    .lint('outletElements')
    .getDiagnostics('outletElements')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 8)
  expect(diagnostics).toHaveProperty('0.to', 10)
  expect(diagnostics).toHaveProperty('0.message', 'Unsupported attribute.')
  expect(diagnostics).toHaveProperty('1.from', 11)
  expect(diagnostics).toHaveProperty('1.to', 15)
  expect(diagnostics).toHaveProperty('1.message', 'Unsupported attribute.')
  expect(diagnostics).toHaveProperty('2.from', 16)
  expect(diagnostics).toHaveProperty('2.to', 19)
  expect(diagnostics).toHaveProperty('2.message', 'Unsupported attribute.')
})
