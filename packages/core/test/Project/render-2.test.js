import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/render-2'
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

test('rendering', () => {
  const results = project.render('/')

  expect(results.diagnostics).toHaveLength(0)
  expect(results.html).toBe('<div>foo<div>foo-bar baz</div></div>')
})
