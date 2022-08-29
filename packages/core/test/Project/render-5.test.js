import fs from 'fs'
import { Project } from '../..'

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
    '<div x-data="_c1_D"><div><span x-bind="_c1b1_D"></span> <span>ship(s)</span></div><div><button @click="count++">Increment counter</button></div><p>Click the button</p></div>',
  )
  expect(project.render('/').html).toBe(
    '<div x-data="_c1_D"><div><span x-bind="_c1b1_D"></span> <span>ship(s)</span></div><div><button @click="count++">Increment counter</button></div><p>Click the button</p></div>',
  )
})
