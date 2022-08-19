import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/lint-outlet-elements'
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

test('linting page', () => {
  const diagnostics = project
    .lintPage('/', 'outletElements')
    .getPageDiagnostics('/', 'outletElements')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 255)
  expect(diagnostics).toHaveProperty('0.to', 272)
  expect(diagnostics).toHaveProperty('0.message', 'Pages cannot have outlets.')
})

test('linting component (1)', () => {
  const diagnostics = project
    .lintComponent('foo', 'outletElements')
    .getComponentDiagnostics('foo', 'outletElements')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 23)
  expect(diagnostics).toHaveProperty('0.to', 23)
  expect(diagnostics).toHaveProperty('0.message', 'Invalid component name.')
  expect(diagnostics).toHaveProperty('1.from', 24)
  expect(diagnostics).toHaveProperty('1.to', 27)
  expect(diagnostics).toHaveProperty('1.message', 'Invalid component name.')
  expect(diagnostics).toHaveProperty('2.from', 32)
  expect(diagnostics).toHaveProperty('2.to', 35)
  expect(diagnostics).toHaveProperty('2.message', 'Component does not exist.')
})

test('linting component (2)', () => {
  const diagnostics = project
    .lintComponent('bar', 'outletElements')
    .getComponentDiagnostics('bar', 'outletElements')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 0)
  expect(diagnostics).toHaveProperty('0.to', 28)
  expect(diagnostics).toHaveProperty('0.message', 'Outlets cannot be used as root elements.')
})
