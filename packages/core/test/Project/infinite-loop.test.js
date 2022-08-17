import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/infinite-loop'
const project = new Project({
  components: [
    {
      name: 'loop',
      html: fs.readFileSync(`${dir}/components/loop.html`, 'utf-8'),
    },
  ],
  pages: [
    {
      path: '/',
      html: fs.readFileSync(`${dir}/pages/index.html`, 'utf-8'),
    },
  ],
})

test('getting included components', () => {
  expect(project.getIncludedComponentNames('loop')).toEqual(['loop'])
})

it('should stop rendering after 10 loops', () => {
  expect('@todo').toBe('@todo')
})
