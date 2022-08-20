import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/render-4'
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
  expect(project.render('/').html).toBe('')
  expect(project.render('/', { foo: '0' }).html).toBe('')
  expect(project.render('/', { foo: '1' }).html).toBe('foo')
  expect(project.render('/', { foo: '1', bar: '1' }).html).toBe('foo')
  expect(project.render('/', { foo: '1', bar: 'bar' }).html).toBe('foo bar')
})
