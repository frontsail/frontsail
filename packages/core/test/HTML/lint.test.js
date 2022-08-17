import { HTML } from '../..'

test('linting attribute names', () => {
  const diagnostics = new HTML('<div {{ foo }} bar_baz></div>').lint('*').getDiagnostics('*')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 5)
  expect(diagnostics).toHaveProperty('0.to', 7)
  expect(diagnostics[0].message).toMatch(/mustache/i)
  expect(diagnostics).toHaveProperty('1.from', 12)
  expect(diagnostics).toHaveProperty('1.to', 14)
  expect(diagnostics[1].message).toMatch(/mustache/i)
  expect(diagnostics).toHaveProperty('2.from', 15)
  expect(diagnostics).toHaveProperty('2.to', 22)
  expect(diagnostics[2].message).not.toMatch(/mustache/i)
})

test('linting if attributes', () => {
  const diagnostics = new HTML('<div if="+foo"><slot if="bar()"></slot></div>')
    .lint('*')
    .getDiagnostics('*')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 21)
  expect(diagnostics).toHaveProperty('0.to', 23)
  expect(diagnostics[0].message).toMatch(/slot/i)
  expect(diagnostics).toHaveProperty('1.from', 25)
  expect(diagnostics).toHaveProperty('1.to', 30)
  expect(diagnostics[1].message).toMatch(/expression/i)
})

test('linting include elements (1)', () => {
  const diagnostics = new HTML('<include if="foo" bar="baz" data-baz />')
    .lint('*')
    .getDiagnostics('*')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 28)
  expect(diagnostics).toHaveProperty('0.to', 36)
  expect(diagnostics[0].message).toMatch(/property/i)
  expect(diagnostics).toHaveProperty('1.from', 0)
  expect(diagnostics).toHaveProperty('1.to', 39)
  expect(diagnostics[1].message).toMatch(/missing/i)
})

test('linting include elements (2)', () => {
  const diagnostics = new HTML('<include component="/foo" asset="bar" />')
    .lint('*')
    .getDiagnostics('*')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 20)
  expect(diagnostics).toHaveProperty('0.to', 24)
  expect(diagnostics[0].message).toMatch(/component/i)
  expect(diagnostics).toHaveProperty('1.from', 0)
  expect(diagnostics).toHaveProperty('1.to', 40)
  expect(diagnostics[1].message).toMatch(/same time/i)
  expect(diagnostics).toHaveProperty('2.from', 33)
  expect(diagnostics).toHaveProperty('2.to', 36)
  expect(diagnostics[2].message).toMatch(/asset/i)
})

test('linting include elements (3)', () => {
  const diagnostics = new HTML('<include if="foo" asset="/assets/bar" baz>')
    .lint('*')
    .getDiagnostics('*')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 38)
  expect(diagnostics).toHaveProperty('0.to', 41)
  expect(diagnostics[0].message).toMatch(/asset/i)
})
