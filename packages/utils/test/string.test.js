import { camelize, escape, hash, slugify, split } from '..'

test('camelize', () => {
  expect(camelize('foo bar')).toBe('fooBar')
  expect(camelize('FOO')).toBe('foo')
  expect(camelize('SEO Friendly String!')).toBe('seoFriendlyString')
})

test('escape', () => {
  expect(escape('<div></div>')).toBe('&lt;div&gt;&lt;/div&gt;')
  expect(escape('<div foo="bar"></div>')).toBe('&lt;div foo=&quot;bar&quot;&gt;&lt;/div&gt;')
  expect(escape("<div foo='bar'>&</div>")).toBe('&lt;div foo=&#39;bar&#39;&gt;&&lt;/div&gt;')
})

test('hash', () => {
  expect(hash('foo')).toBe(101574)
  expect(hash('bar')).toBe(97299)
  expect(hash('')).toBe(0)
})

test('split', () => {
  expect(split('a|b', '|')).toEqual([
    { value: 'a', from: 0, to: 1 },
    { value: 'b', from: 2, to: 3 },
  ])
})

test('slugify', () => {
  expect(slugify('SEO Friendly String!')).toBe('seo-friendly-string')
  expect(slugify('123 foo bar', '_', true)).toBe('foo_bar')
})
