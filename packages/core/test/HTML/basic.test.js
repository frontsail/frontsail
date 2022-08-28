import { HTML } from '../..'

test('serialization and listing nodes', () => {
  const html = new HTML('<div>&amp;</div>')
  const nodes = html.getNodes()

  expect(html.toString()).toBe('<div>&amp;</div>')
  expect(nodes).toHaveLength(3)
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

test('replacing div element with multiple span elements', () => {
  const html = new HTML('<div></div>')

  HTML.replaceElement(
    html.getElement('div'),
    HTML.createElement('span'),
    HTML.createElement('span'),
    HTML.createElement('span'),
  )

  expect(html.toString()).toBe('<span></span><span></span><span></span>')
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
  const html = new HTML('<div foo="{{ foo }}">{{ $bar }}</div>')
  const mustaches = html.getMustaches()

  expect(mustaches).toHaveLength(2)
  expect(mustaches).toHaveProperty('0.variable', 'foo')
  expect(mustaches).toHaveProperty('0.from', 10)
  expect(mustaches).toHaveProperty('0.to', 19)
  expect(mustaches).toHaveProperty('1.variable', '$bar')
  expect(mustaches).toHaveProperty('1.from', 21)
  expect(mustaches).toHaveProperty('1.to', 31)
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
    'inlineCSS',
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

test('getting include properties', () => {
  const html = new HTML(
    '<include if="foo" component="bar" foo bar="bar" baz="{{ baz }}"></include>',
  )
  const element = html.getElement('include')

  expect(HTML.getIncludeProperties(element)).toEqual({ foo: '', bar: 'bar', baz: '{{ baz }}' })
})

test('getting injections (1)', () => {
  const html = new HTML('<include> <div></div>  foo \n<span></span> </include>')
  const element = html.getElement('include')
  const injections = HTML.getInjections(element)

  expect(Object.keys(injections)).toEqual(['main'])
  expect(injections['main']).toHaveLength(5)
  expect(injections['main']).toHaveProperty('1', html.getElement('div'))
  expect(injections['main']).toHaveProperty('3', html.getElement('span'))
})

test('getting injections (2)', () => {
  const html = new HTML(
    '<include><inject into="foo"> <div> </div> </inject><inject into="bar"><span></span></inject></include>',
  )
  const element = html.getElement('include')
  const injections = HTML.getInjections(element)

  expect(Object.keys(injections)).toEqual(['foo', 'bar'])
  expect(injections['foo']).toHaveLength(3)
  expect(injections['foo']).toHaveProperty('1', html.getElement('div'))
  expect(injections['bar']).toHaveLength(1)
  expect(injections['bar']).toHaveProperty('0', html.getElement('span'))
})

test('replacing mustaches', () => {
  const html = new HTML('<div foo="{{ bar }}">{{baz}}</div>')
  const replaced = html.replaceMustaches({ foo: 'foo', bar: 'bar' })

  expect(replaced.toString()).toBe('<div foo="bar"></div>')
})

test('minification', () => {
  expect(new HTML('foo\nbar').toString(true)).toBe('foo bar')
  expect(new HTML('<div> </div>').toString(true)).toBe('<div></div>')
  expect(new HTML('<div>foo</div>').toString(true)).toBe('<div>foo</div>')
  expect(new HTML('<div> foo </div>').toString(true)).toBe('<div>foo</div>')
  expect(new HTML('<span>foo</span>').toString(true)).toBe('<span>foo</span>')
  expect(new HTML('<span> foo </span> bar').toString(true)).toBe('<span>foo </span>bar')
  expect(new HTML('<span> foo </span>bar').toString(true)).toBe('<span>foo </span>bar')
  expect(new HTML('<span> </span> bar').toString(true)).toBe('<span></span> bar')
  expect(new HTML('<span> foo </span>').toString(true)).toBe('<span>foo</span>')
  expect(new HTML('<span> foo </span><span>bar</span>').toString(true)).toBe(
    '<span>foo </span><span>bar</span>',
  )
  expect(new HTML('<span> foo </span>\n<div>bar</div>').toString(true)).toBe(
    '<span>foo</span><div>bar</div>',
  )
  expect(new HTML('<span> foo </span> x <div>bar</div>').toString(true)).toBe(
    '<span>foo </span>x<div>bar</div>',
  )
  expect(new HTML('<span> <div></div> </span>\n<span> bar </span>\n').toString(true)).toBe(
    '<span><div></div></span> <span>bar</span>',
  )
  expect(new HTML('<span> foo <div></div> x </span> x <div>bar</div>').toString(true)).toBe(
    '<span>foo<div></div>x </span>x<div>bar</div>',
  )
  expect(new HTML('<span> foo <div></div> x</span> x <div>bar</div>').toString(true)).toBe(
    '<span>foo<div></div>x</span> x<div>bar</div>',
  )
})

test('extracting root nodes', () => {
  expect(new HTML('<html></html>').getRootNodes()).toHaveLength(1)
  expect(new HTML('<html></html>').getRootNodes()).toHaveProperty('0.tagName', 'html')
  expect(new HTML('<!DOCTYPE html><html></html>').getRootNodes()).toHaveProperty(
    '0.tagName',
    'html',
  )
})
