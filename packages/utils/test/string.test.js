import {
  camelize,
  camelToSnake,
  escape,
  hash,
  lowerCaseFirstLetter,
  pluralize,
  slugify,
  split,
  uppercaseFirstLetter,
} from '../dist'

test('camelize', () => {
  expect(camelize('foo bar')).toBe('fooBar')
  expect(camelize('FOO')).toBe('foo')
  expect(camelize('SEO Friendly String!')).toBe('seoFriendlyString')
})

test('camelToSnake', () => {
  expect(camelToSnake('fooBar')).toBe('foo_bar')
  expect(camelToSnake('foo')).toBe('foo')
  expect(camelToSnake('fooBarBaz')).toBe('foo_bar_baz')
  expect(camelToSnake('FOO')).toBe('f_o_o')
  expect(camelToSnake('FooBar')).toBe('foo_bar')
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

test('lowerCaseFirstLetter', () => {
  expect(lowerCaseFirstLetter('Foo')).toBe('foo')
  expect(lowerCaseFirstLetter('foo')).toBe('foo')
  expect(lowerCaseFirstLetter('FOO')).toBe('fOO')
})

test('pluralize', () => {
  expect(pluralize('foo')).toBe('foos')
  expect(pluralize('Bar')).toBe('Bars')
  expect(pluralize('baz')).toBe('bazs')
  expect(pluralize('entry')).toBe('entries')
})

test('slugify', () => {
  expect(slugify('SEO Friendly String!')).toBe('seo-friendly-string')
  expect(slugify('123 foo bar', '_', true)).toBe('foo_bar')
})

test('split', () => {
  expect(split('a|b', '|')).toEqual([
    { value: 'a', from: 0, to: 1 },
    { value: 'b', from: 2, to: 3 },
  ])
})

test('uppercaseFirstLetter', () => {
  expect(uppercaseFirstLetter('foo')).toBe('Foo')
  expect(uppercaseFirstLetter('fOO')).toBe('FOO')
  expect(uppercaseFirstLetter('FOO')).toBe('FOO')
})
