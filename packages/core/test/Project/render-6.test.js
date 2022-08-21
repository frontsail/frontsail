import fs from 'fs'
import { HTML, Project } from '../..'

const dir = 'test/Project/render-6'
const project = new Project({
  components: [
    {
      name: 'foo',
      html: fs.readFileSync(`${dir}/components/foo.html`, 'utf-8'),
    },
  ],
})

test('rendering (production)', () => {
  const results = project.render('foo', { foo: '1' })

  expect(results.diagnostics).toHaveLength(0)
  expect(results.html).toBe(
    '<div x-data="_c1_D" data-foo="1"><template x-bind="_c1b1_D"><template x-for="bar in 10"><div><span x-bind="_c1b2_D"></span></div></template></template></div>',
  )
})

test('rendering (development)', () => {
  const results = project.setEnvironment('development').render('foo', { foo: '1' })

  expect(new HTML(results.html).toString(true)).toBe(
    '<div x-data="{ foo: false }" data-foo="1"><template x-if="foo"><template x-for="bar in 10"><div><span x-text="bar"></span></div></template></template></div>',
  )
})
