import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/infinite-loop'
const project = new Project({
  components: [
    {
      name: 'loop',
      html: fs.readFileSync(`${dir}/components/loop.html`, 'utf-8'),
    },
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
    {
      path: '/foo-bar',
      html: fs.readFileSync(`${dir}/pages/foo-bar.html`, 'utf-8'),
    },
  ],
})

test('getting included components', () => {
  expect(project.getIncludedComponentNames('loop', true)).toEqual(['loop'])
  expect(project.getIncludedComponentNames('foo', true)).toEqual(['bar', 'foo'])
  expect(project.getIncludedComponentNames('bar', true)).toEqual(['bar', 'foo'])
  expect(project.getIncludedComponentNames('/', true)).toEqual(['loop'])
  expect(project.getIncludedComponentNames('/foo-bar', true)).toEqual(['bar', 'foo'])
})

it('should stop rendering after detecting inifinte loops (1)', () => {
  const results = project.render('/')

  expect(results.diagnostics).toHaveLength(1)
  expect(results.diagnostics).toHaveProperty('0.templateId', 'loop')
  expect(results.diagnostics).toHaveProperty('0.from', 22)
  expect(results.diagnostics).toHaveProperty('0.to', 58)
  expect(results.diagnostics).toHaveProperty(
    '0.message',
    "The included component 'loop' caused an infinite loop.",
  )
  expect(results.html).toBe('<div> <p>loop</p> </div>')
})

it('should stop rendering after detecting inifinte loops (2)', () => {
  const results = project.render('/foo-bar')

  expect(results.diagnostics).toHaveLength(1)
  expect(results.diagnostics).toHaveProperty('0.templateId', 'bar')
  expect(results.diagnostics).toHaveProperty('0.from', 14)
  expect(results.diagnostics).toHaveProperty('0.to', 49)
  expect(results.diagnostics).toHaveProperty(
    '0.message',
    "The included component 'foo' caused an infinite loop.",
  )
  expect(results.html).toBe('<div> foo <div> bar </div> </div>')
})
