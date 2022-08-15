import { HTML } from '@frontsail/core'

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
