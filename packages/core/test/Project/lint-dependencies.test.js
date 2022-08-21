import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/lint-dependencies'
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

  expect(diagnostics).toHaveLength(4)
  expect(diagnostics).toHaveProperty('0.from', 280)
  expect(diagnostics).toHaveProperty('0.to', 283)
  expect(diagnostics).toHaveProperty(
    '0.message',
    "Property 'bar' does not exist in component 'foo'.",
  )
  expect(diagnostics).toHaveProperty('1.from', 482)
  expect(diagnostics).toHaveProperty('1.to', 485)
  expect(diagnostics).toHaveProperty('1.message', "Outlet 'baz' does not exist in component 'bar'.")
  expect(diagnostics).toHaveProperty('2.from', 563)
  expect(diagnostics).toHaveProperty('2.to', 566)
  expect(diagnostics).toHaveProperty('2.message', 'Component does not exist.')
  expect(diagnostics).toHaveProperty('3.from', 631)
  expect(diagnostics).toHaveProperty('3.to', 634)
  expect(diagnostics).toHaveProperty('3.message', "Component 'foo' has no outlets.")
})

test('linting component dependencies', () => {
  const diagnostics = project
    .lintComponent('foo', 'dependencies')
    .getComponentDiagnostics('foo', 'dependencies')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 28)
  expect(diagnostics).toHaveProperty('0.to', 31)
  expect(diagnostics).toHaveProperty('0.message', 'Component does not exist.')
})
