import fs from 'fs'
import { Project } from '../..'

const dir = 'test/Project/render-3'
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
  globals: {
    $foo: '<&foo>',
    $bar: '&bar',
  },
})

test('rendering (production)', () => {
  const results = project.render('/')

  expect(results.diagnostics).toHaveLength(0)
  expect(results.html).toBe(
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Test</title></head><body><div>&lt;&amp;foo&gt;</div><div x-data="_c2_D"><span x-bind="bar" bar="&amp;bar" x-on:click="baz">&amp;bar</span></div></body></html>',
  )
})
