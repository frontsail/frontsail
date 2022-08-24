import { CSS } from '../..'

test('linting invalid modifier name', () => {
  const diagnostics = new CSS('.foo { & %bar_baz { display: block } }')
    .lint()
    .getDiagnostics('logical')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 9)
  expect(diagnostics).toHaveProperty('0.to', 17)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid modifier format.')
})

test('linting missing parent rule for at-rule declarations (1)', () => {
  const diagnostics = new CSS('@sm { display: block }').lint().getDiagnostics('logical')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 6)
  expect(diagnostics).toHaveProperty('0.to', 20)
  expect(diagnostics).toHaveProperty('0.message', 'Missing parent rule.')
})

test('linting missing parent rule for at-rule declarations (2)', () => {
  const diagnostics = new CSS('@sm { @print {  display:  block;   } }')
    .lint()
    .getDiagnostics('logical')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 16)
  expect(diagnostics).toHaveProperty('0.to', 32)
  expect(diagnostics).toHaveProperty('0.message', 'Missing parent rule.')
})
