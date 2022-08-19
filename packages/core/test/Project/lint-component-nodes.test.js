import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/lint-component-nodes'
const project = new Project({
  components: [
    {
      name: 'foo',
      html: fs.readFileSync(`${dir}/components/foo.html`, 'utf-8'),
    },
    {
      name: 'bar',
      html: fs.readFileSync(`${dir}/components/bar.html`, 'utf-8'),
    },
    {
      name: 'baz',
      html: fs.readFileSync(`${dir}/components/baz.html`, 'utf-8'),
    },
  ],
})

test('linting component nodes (1)', () => {
  const diagnostics = project.lintComponent('foo', '*').getComponentDiagnostics('foo', '*')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 11)
  expect(diagnostics).toHaveProperty('0.to', 16)
  expect(diagnostics).toHaveProperty('0.message', 'Components can have only one root node.')
})

test('linting component nodes (2)', () => {
  const diagnostics = project.lintComponent('bar', '*').getComponentDiagnostics('bar', '*')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 0)
  expect(diagnostics).toHaveProperty('0.to', 28)
  expect(diagnostics).toHaveProperty('0.message', 'Outlets cannot be used as root elements.')
})

test('linting component nodes (3)', () => {
  const diagnostics = project.lintComponent('baz', '*').getComponentDiagnostics('baz', '*')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 20)
  expect(diagnostics).toHaveProperty('0.to', 26)
  expect(diagnostics).toHaveProperty(
    '0.message',
    "The 'x-data' directive can only be used in the root element.",
  )
})
