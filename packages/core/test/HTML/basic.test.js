import { HTML } from '../..'

test('serialization and listing nodes', () => {
  const html = new HTML('<div></div>')
  const nodes = html.getNodes()

  expect(html.toString()).toBe('<div></div>')
  expect(nodes).toHaveLength(2)
  expect(nodes).toHaveProperty('1.tagName', 'div')
})

test('finding elements', () => {
  const html = new HTML('<header><div></div><div foo="bar"></div></header>')

  expect(html.getElement('header')).toHaveProperty('tagName', 'header')
  expect(html.getElement('div').attrs).toHaveLength(0)
  expect(html.getElements('div')).toHaveLength(2)
  expect(html.getElements('span')).toHaveLength(0)
  expect(html.getElement('span')).toBe(null)
  expect(html.getElement('*')).toHaveProperty('tagName', 'header')
  expect(html.getElements('*')).toHaveLength(3)
  expect(html.getElements('*')).toHaveProperty('0.tagName', 'header')
  expect(html.getElements('*', { foo: 'bar' })).toHaveLength(1)
  expect(html.getElement('*', { foo: 'bar' }).attrs).toHaveLength(1)
})

test('finding template elements', () => {
  const html = new HTML('<header><template><div><span></span></div></template></header>')

  expect(html.getElement('header')).not.toBe(null)
  expect(html.getElement('template')).not.toBe(null)
  expect(html.getElement('div')).not.toBe(null)
  expect(html.getElement('span')).not.toBe(null)
})

test('replacing a cloned div element', () => {
  const html = new HTML('<div></div>')
  const clone = html.clone()

  HTML.replaceElement(clone.getElement('div'), HTML.createElement('span'))

  expect(html.toString()).toBe('<div></div>')
  expect(clone.toString()).toBe('<span></span>')
})

test('finding parent element', () => {
  const html = new HTML('<header><template><div><span></span></div></template></header>')
  const span = html.getElement('span')

  expect(HTML.hasParent(span, 'div')).toBe(true)
  expect(HTML.hasParent(span, 'template')).toBe(false)
  expect(HTML.hasParent(span, 'header')).toBe(false)
  expect(HTML.hasParent(span, 'footer')).toBe(false)
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
  const div = html.getElement('div')
  const range = html.getAttributeNameRange(div, 'foo')

  expect(range).toHaveProperty('from', 5)
  expect(range).toHaveProperty('to', 8)
})

test('attribute name range (2)', () => {
  const html = new HTML('<div foo = bar></div>')
  const div = html.getElement('div')
  const range = html.getAttributeNameRange(div, 'foo')

  expect(range).toHaveProperty('from', 5)
  expect(range).toHaveProperty('to', 8)
})

test('attribute value range (1)', () => {
  const html = new HTML('<div foo=" bar "></div>')
  const div = html.getElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 10)
  expect(range).toHaveProperty('to', 15)
})

test('attribute value range (2)', () => {
  const html = new HTML('<div foo= bar ></div>')
  const div = html.getElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 10)
  expect(range).toHaveProperty('to', 13)
})

test('attribute value range (3)', () => {
  const html = new HTML(`<div foo='bar'></div>`)
  const div = html.getElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 10)
  expect(range).toHaveProperty('to', 13)
})

test('attribute value range (4)', () => {
  const html = new HTML(`<div foo=bar"></div>`)
  const div = html.getElement('div')
  const range = html.getAttributeValueRange(div, 'foo')

  expect(range).toHaveProperty('from', 9)
  expect(range).toHaveProperty('to', 13)
})

test('filtering tests', () => {
  const html = new HTML('')
  const types = [
    'alpineDirectives',
    'attributeNames',
    'ifAttributes',
    'includeElements',
    'injectElements',
    'mustacheLocations',
    'mustacheValues',
    'outletElements',
    'syntax',
  ]

  expect(html.filterTests(['*'])).toEqual(types)
  expect(html.filterTests(['*', 'syntax'])).toEqual(types)
  expect(html.filterTests([])).toEqual([])
  expect(html.filterTests(['foo'])).toEqual([])
  expect(html.filterTests(['foo', '*'])).toEqual(types)
})

test('getting into attribute value from injects', () => {
  const html = new HTML(
    '<inject></inject><inject into="foo"></inject><inject into></inject><inject into=""></inject>',
  )
  const elements = html.getElements('inject')

  expect(HTML.getInjectIntoValue(elements[0])).toBe('main')
  expect(HTML.getInjectIntoValue(elements[1])).toBe('foo')
  expect(HTML.getInjectIntoValue(elements[2])).toBe('')
  expect(HTML.getInjectIntoValue(elements[3])).toBe('')
})

test('getting name attribute value from outlets', () => {
  const html = new HTML(
    '<outlet></outlet><outlet name="foo"></outlet><outlet name></outlet><outlet name=""></outlet>',
  )
  const elements = html.getElements('outlet')

  expect(HTML.getOutletName(elements[0])).toBe('main')
  expect(HTML.getOutletName(elements[1])).toBe('foo')
  expect(HTML.getOutletName(elements[2])).toBe('')
  expect(HTML.getOutletName(elements[3])).toBe('')
})
