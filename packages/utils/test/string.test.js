import { escape, split } from '..'

test('escape', () => {
  expect(escape('<div></div>')).toBe('&lt;div&gt;&lt;/div&gt;')
  expect(escape('<div foo="bar"></div>')).toBe('&lt;div foo=&quot;bar&quot;&gt;&lt;/div&gt;')
  expect(escape("<div foo='bar'>&</div>")).toBe('&lt;div foo=&#39;bar&#39;&gt;&amp;&lt;/div&gt;')
})

test('split', () => {
  expect(split('a|b', '|')).toEqual([
    { value: 'a', from: 0, to: 1 },
    { value: 'b', from: 2, to: 3 },
  ])
})
