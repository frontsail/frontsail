import { Project } from '../..'

test('linting custom scripts', () => {
  const diagnostics = new Project({
    js: 'foo bar',
  })
    .lintCustomJS()
    .getCustomJSDiagnostics('*')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 4)
  expect(diagnostics).toHaveProperty('0.to', 4)
  expect(diagnostics).toHaveProperty('0.message', 'Unexpected token.')
})
