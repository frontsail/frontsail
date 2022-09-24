import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/lint-alpine-directives'
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

test('linting alpine directives (page)', () => {
  const diagnostics = project
    .lintPage('/', 'alpineDirectives')
    .getPageDiagnostics('/', 'alpineDirectives')

  expect(diagnostics).toHaveLength(3)
  expect(diagnostics).toHaveProperty('0.from', 369)
  expect(diagnostics).toHaveProperty('0.to', 369)
  expect(diagnostics).toHaveProperty('0.message', 'Unexpected token.')
  expect(diagnostics).toHaveProperty('1.from', 250)
  expect(diagnostics).toHaveProperty('1.to', 257)
  expect(diagnostics).toHaveProperty(
    '1.message',
    "Alpine directives in pages cannot be used outside of 'include' elements.",
  )
  expect(diagnostics).toHaveProperty('2.from', 410)
  expect(diagnostics).toHaveProperty('2.to', 416)
  expect(diagnostics).toHaveProperty(
    '2.message',
    "The 'x-data' directive can only be used in components.",
  )
})

test('full lint (page)', () => {
  const diagnostics = project.lintPage('/', '*').getPageDiagnostics('/', '*')

  expect(diagnostics).toHaveLength(7)
  expect(diagnostics).toHaveProperty('3.from', 336)
  expect(diagnostics).toHaveProperty('3.to', 339)
  expect(diagnostics).toHaveProperty(
    '3.message',
    "Property 'bar' does not exist in component 'bar'.",
  )
  expect(diagnostics).toHaveProperty('5.from', 368)
  expect(diagnostics).toHaveProperty('5.to', 377)
  expect(diagnostics).toHaveProperty('5.message', 'Mustaches cannot be used in Alpine directives.')
})

test('linting alpine directives (component 1)', () => {
  const diagnostics = project
    .lintComponent('foo', 'alpineDirectives')
    .getComponentDiagnostics('foo', 'alpineDirectives')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 46)
  expect(diagnostics).toHaveProperty('0.to', 46)
  expect(diagnostics).toHaveProperty('0.message', 'Unexpected token.')
})

test('full lint (component 1)', () => {
  const diagnostics = project.lintComponent('foo', '*').getComponentDiagnostics('foo', '*')

  expect(diagnostics).toHaveProperty('1.from', 45)
  expect(diagnostics).toHaveProperty('1.to', 54)
  expect(diagnostics).toHaveProperty('1.message', 'Mustaches cannot be used in Alpine directives.')
})

test('linting alpine directives (component 2)', () => {
  const diagnostics = project
    .lintComponent('bar', 'alpineDirectives')
    .getComponentDiagnostics('bar', 'alpineDirectives')

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics).toHaveProperty('0.from', 13)
  expect(diagnostics).toHaveProperty('0.to', 16)
  expect(diagnostics).toHaveProperty('0.message', 'Alpine data must be an object.')
})

test('full lint (component 2)', () => {
  const diagnostics = project.lintComponent('bar', '*').getComponentDiagnostics('bar', '*')

  expect(diagnostics).toHaveLength(1)
})
