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
