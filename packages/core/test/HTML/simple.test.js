import { HTML } from '@frontsail/core'

test('serialization and listing nodes', () => {
  const html = new HTML('<div></div>')
  const nodes = html.getNodes()

  expect(html.toString()).toBe('<div></div>')
  expect(nodes).toHaveLength(2)
  expect(nodes).toHaveProperty('1.tagName', 'div')
})

test('finding elements', () => {
  const html = new HTML('<header><div></div><div foo="bar"></div></header>')

  expect(html.findElement('header')).toHaveProperty('tagName', 'header')
  expect(html.findElement('div').attrs).toHaveLength(0)
  expect(html.findElements('div')).toHaveLength(2)
  expect(html.findElements('span')).toHaveLength(0)
  expect(html.findElement('span')).toBe(null)
  expect(html.findElement('*')).toHaveProperty('tagName', 'header')
  expect(html.findElements('*')).toHaveLength(3)
  expect(html.findElements('*')).toHaveProperty('0.tagName', 'header')
  expect(html.findElements('*', { foo: 'bar' })).toHaveLength(1)
  expect(html.findElement('*', { foo: 'bar' }).attrs).toHaveLength(1)
})

test('replacing a cloned div element', () => {
  const html = new HTML('<div></div>')
  const clone = html.clone()

  HTML.replaceElement(clone.findElement('div'), HTML.createElement('span'))

  expect(html.toString()).toBe('<div></div>')
  expect(clone.toString()).toBe('<span></span>')
})

test('extracting mustache tags', () => {
  const html = new HTML('<div foo="{{ foo }}">{{ BAR }}</div>')
  const mustaches = html.getMustaches()

  expect(mustaches).toHaveLength(2)
  expect(mustaches).toHaveProperty('0.variable', 'foo')
  expect(mustaches).toHaveProperty('0.from', 10)
  expect(mustaches).toHaveProperty('0.to', 19)
  expect(mustaches).toHaveProperty('1.variable', 'BAR')
  expect(mustaches).toHaveProperty('1.from', 21)
  expect(mustaches).toHaveProperty('1.to', 30)
})

test('extracting attribute values', () => {
  const html = new HTML('<div foo="bar"></div>')
  const attributes = html.getAttributeValues('foo')

  expect(attributes).toHaveLength(1)
  expect(attributes).toHaveProperty('0.text', 'bar')
  expect(attributes).toHaveProperty('0.element.tagName', 'div')
  expect(attributes).toHaveProperty('0.from', 10)
  expect(attributes).toHaveProperty('0.to', 13)
  expect(html.getAttributeValues('bar')).toHaveLength(0)
})

test('extracting property names', () => {
  expect(new HTML('<div if="foo">{{ bar }}</div>').getPropertyNames()).toEqual(['bar', 'foo'])
  expect(new HTML('<img if="foo && !bar_baz">').getPropertyNames()).toEqual(['bar_baz', 'foo'])
  expect(new HTML('<img if="{{ foo }}" {{ bar }}>').getPropertyNames()).toEqual(['bar', 'foo'])
})

test('attribute name range (1)', () => {
  const html = new HTML('<div foo="bar"></div>')
  const div = html.findElement('div')
  const range = html.getAttributeNameRange(div, 'foo')

  expect(range).toHaveProperty('from', 5)
  expect(range).toHaveProperty('to', 8)
})

test('attribute name range (2)', () => {
  const html = new HTML('<div foo = bar></div>')
  const div = html.findElement('div')
  const range = html.getAttributeNameRange(div, 'foo')

  expect(range).toHaveProperty('from', 5)
  expect(range).toHaveProperty('to', 8)
})

test('attribute value range (1)', () => {
  const html = new HTML('<div foo=" bar "></div>')
  const div = html.findElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 10)
  expect(range).toHaveProperty('to', 15)
})

test('attribute value range (2)', () => {
  const html = new HTML('<div foo= bar ></div>')
  const div = html.findElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 10)
  expect(range).toHaveProperty('to', 13)
})

test('attribute value range (3)', () => {
  const html = new HTML(`<div foo='bar'></div>`)
  const div = html.findElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 10)
  expect(range).toHaveProperty('to', 13)
})

test('attribute value range (4)', () => {
  const html = new HTML(`<div foo=bar"></div>`)
  const div = html.findElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 9)
  expect(range).toHaveProperty('to', 13)
})
