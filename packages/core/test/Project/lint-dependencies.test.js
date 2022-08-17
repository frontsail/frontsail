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
  const diagnostics = project.lintPage('/', '*').getPageDiagnostics('/', '*')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 280)
  expect(diagnostics).toHaveProperty('0.to', 283)
  expect(diagnostics).toHaveProperty('1.from', 323)
  expect(diagnostics).toHaveProperty('1.to', 326)
})

test('linting component dependencies', () => {
  const diagnostics = project.lintComponent('foo', '*').getComponentDiagnostics('foo', '*')

  expect(diagnostics).toHaveLength(2)
  expect(diagnostics).toHaveProperty('0.from', 28)
  expect(diagnostics).toHaveProperty('0.to', 31)
  expect(diagnostics).toHaveProperty('1.from', 54)
  expect(diagnostics).toHaveProperty('1.to', 65)
})
