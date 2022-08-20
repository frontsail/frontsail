import fs from 'fs'
import { HTML, Project } from '../..'

const dir = 'test/Project/render-5'
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

test('rendering (production)', () => {
  expect(project.render('/').diagnostics).toHaveLength(0)
  expect(project.render('/').html).toBe(
    '<div x-data="_c1_D"><div><span x-bind="_c1b1_D"></span> <span></span></div><div><button @click="count++">Increase counter</button></div><p>Click the button</p></div>',
  )
  expect(project.render('/', { items: 'ship(s)' }).html).toBe(
    '<div x-data="_c1_D"><div><span x-bind="_c1b1_D"></span> <span>ship(s)</span></div><div><button @click="count++">Increase counter</button></div><p>Click the button</p></div>',
  )
})

test('rendering (development)', () => {
  expect(
    new HTML(project.setEnvironment('development').render('/', { items: 'ship(s)' }).html).toString(
      true,
    ),
  ).toBe(
    '<div x-data="{ count: 0 }"><div><span x-text="count"></span> <span>ship(s)</span></div><div><button @click="count++">Increase counter</button></div><p>Click the button</p></div>',
  )
})
