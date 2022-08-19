import { JS } from '..'

test('initialization', () => {
  expect(new JS('foo').hasProblems('*')).toBe(false)
  expect(new JS('foo bar').hasProblems('*')).toBe(true)
  expect(new JS('foo').getNodes()).toHaveLength(3)
})

test('evaluation', () => {
  expect(new JS('1').evaluate()).toBe(1)
  expect(new JS('foo').evaluate({ foo: 'bar' })).toBe('bar')
  expect(new JS('process').evaluate()).toBe('')
  expect(new JS('process.exit(1)').evaluate()).toBe(undefined)
})

test('evaluation diagnostics', () => {
  const js = new JS('process.exit(1)')
  js.evaluate()

  expect(js.getDiagnostics('runtime')).toHaveLength(1)
  expect(js.getDiagnostics('runtime')).toHaveProperty('0.to', 15)
})

test('extracting identifiers', () => {
  expect(new JS('foo').getIdentifiers()).toEqual(['foo'])
  expect(new JS('foo.bar').getIdentifiers()).toEqual(['foo'])
  expect(new JS('foo && bar').getIdentifiers()).toEqual(['foo', 'bar'])
  expect(new JS('foo().bar().baz').getIdentifiers()).toEqual(['foo'])
  expect(new JS('`${(+foo + +bar)} baz`').getIdentifiers()).toEqual(['foo', 'bar'])
  expect(new JS('{{ foo }} && bar').getIdentifiers()).toEqual([])
})

test('if attribute value check', () => {
  expect(new JS('foo').isIfAttributeValue()).toBe(true)
  expect(new JS('foo + bar').isIfAttributeValue()).toBe(true)
  expect(new JS('`${foo}Bar`').isIfAttributeValue()).toBe(true)
  expect(new JS('+foo').isIfAttributeValue()).toBe(true)
  expect(new JS('foo.bar').isIfAttributeValue()).toBe(true)
  expect(new JS("foo['bar']").isIfAttributeValue()).toBe(true)
  expect(new JS('0').isIfAttributeValue()).toBe(true)
  expect(new JS('!foo').isIfAttributeValue()).toBe(true)
  expect(new JS("foo === 'bar'").isIfAttributeValue()).toBe(true)
  expect(new JS('+foo > 0 && +foo < 1').isIfAttributeValue()).toBe(true)
  expect(new JS('foo()').isIfAttributeValue()).toBe(false)
  expect(new JS('foo.some(bar => !!bar)').isIfAttributeValue()).toBe(false)
  expect(new JS("const foo = 'bar'").isIfAttributeValue()).toBe(false)
  expect(new JS('foo bar').isIfAttributeValue()).toBe(false)
})

test('object check', () => {
  expect(new JS('{}', true).isObject()).toBe(true)
  expect(new JS("{ foo: 'bar' }", true).isObject()).toBe(true)
  expect(new JS('{}').isObject()).toBe(false)
  expect(new JS('const foo = {}').isObject()).toBe(false)
  expect(new JS('foo').isObject()).toBe(false)
  expect(new JS('foo bar').isObject()).toBe(false)
})
