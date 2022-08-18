import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/lint-dependencies'
const project = new Project({
  components: [
    {
      name: 'foo',
      html: fs.readFileSync(`${dir}/components/foo.html`, 'utf-8'),
    },
  ],
  pages: [
    {
      path: '/',
      html: fs.readFileSync(`${dir}/pages/index.html`, 'utf-8'),
    },
  ],
})

test('linting page dependencies', () => {
  const diagnostics = project.lintPage('/', 'dependencies').getPageDiagnostics('/', 'dependencies')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 288)
  expect(diagnostics).toHaveProperty('0.to', 291)
  expect(diagnostics).toHaveProperty(
    '0.message',
    "Property 'bar' does not exist in component 'foo'.",
  )
  expect(diagnostics).toHaveProperty('1.from', 331)
  expect(diagnostics).toHaveProperty('1.to', 334)
  expect(diagnostics).toHaveProperty('1.message', 'Component does not exist.')
})

test('linting component dependencies', () => {
  const diagnostics = project.lintComponent('foo', '*').getComponentDiagnostics('foo', '*')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 28)
  expect(diagnostics).toHaveProperty('0.to', 31)
  expect(diagnostics).toHaveProperty('0.message', 'Component does not exist.')
  expect(diagnostics).toHaveProperty('1.from', 54)
  expect(diagnostics).toHaveProperty('1.to', 65)
  expect(diagnostics).toHaveProperty('1.message', 'Asset does not exist.')
})
