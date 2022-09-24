import {
  isAlpineDirective,
  isAssetPath,
  isAttributeName,
  isComponentName,
  isEnclosed,
  isGlobalName,
  isPagePath,
  isPropertyName,
  isSafeSlug,
  isXForDirective,
} from '..'

test('alpine directive validation', () => {
  expect(isAlpineDirective('x-data')).toBe(true)
  expect(isAlpineDirective('x-on:click')).toBe(true)
  expect(isAlpineDirective('@click')).toBe(true)
  expect(isAlpineDirective('x-on:keyup.shift.enter')).toBe(true)
  expect(isAlpineDirective('@keyup.shift.enter')).toBe(true)
  expect(isAlpineDirective(':class')).toBe(true)
  expect(isAlpineDirective('data')).toBe(false)
  expect(isAlpineDirective('y-data')).toBe(false)
  expect(isAlpineDirective('-click')).toBe(false)
  expect(isAlpineDirective('x-')).toBe(false)
})

test('asset path validation', () => {
  expect(isAssetPath('/assets/foo')).toBe(true)
  expect(isAssetPath('/assets/foo.bar')).toBe(true)
  expect(isAssetPath('/assets/foo.bar.baz')).toBe(true)
  expect(isAssetPath('/assets/foo/bar')).toBe(true)
  expect(isAssetPath('/assets/foo-bar')).toBe(true)
  expect(isAssetPath('/assets/foo_bar')).toBe(true)
  expect(isAssetPath('/assets/foo (bar)')).toBe(true)
  expect(isAssetPath('/assets/-')).toBe(true)
  expect(isAssetPath('/assets/')).toBe(false)
  expect(isAssetPath('/assets//foo')).toBe(false)
  expect(isAssetPath('/assets//foo')).toBe(false)
  expect(isAssetPath('/foo')).toBe(false)
})

test('attribute name validation', () => {
  expect(isAttributeName('foo')).toBe(true)
  expect(isAttributeName(':foo')).toBe(true)
  expect(isAttributeName('@foo')).toBe(true)
  expect(isAttributeName('x-foo')).toBe(true)
  expect(isAttributeName('foo.bar')).toBe(true)
  expect(isAttributeName('foo:bar-baz')).toBe(true)
  expect(isAttributeName('foo:bar.baz')).toBe(true)
  expect(isAttributeName('x-foo:bar.baz')).toBe(true)
  expect(isAttributeName('Foo')).toBe(false)
  expect(isAttributeName('foo--bar')).toBe(false)
  expect(isAttributeName('fooBar')).toBe(false)
  expect(isAttributeName('-foo')).toBe(false)
  expect(isAttributeName('1foo')).toBe(false)
  expect(isAttributeName('foo-')).toBe(false)
  expect(isAttributeName('$foo')).toBe(false)
  expect(isAttributeName('@')).toBe(false)
  expect(isAttributeName(':')).toBe(false)
})

test('component name validation', () => {
  expect(isComponentName('foo')).toBe(true)
  expect(isComponentName('foo/bar')).toBe(true)
  expect(isComponentName('foo/bar/baz')).toBe(true)
  expect(isComponentName('foo-bar')).toBe(true)
  expect(isComponentName('foo-bar/baz')).toBe(true)
  expect(isComponentName('1foo')).toBe(true)
  expect(isComponentName('Foo')).toBe(false)
  expect(isComponentName('foo_bar')).toBe(false)
  expect(isComponentName('/foo')).toBe(false)
  expect(isComponentName('-foo')).toBe(false)
  expect(isComponentName('foo-')).toBe(false)
  expect(isComponentName('$foo')).toBe(false)
})

test('enclosed text validation', () => {
  expect(isEnclosed(`"foo"`, [`"`])).toBe(true)
  expect(isEnclosed(`"foo"`, [`"`, `'`])).toBe(true)
  expect(isEnclosed(`_foo_bar_`, [`_`])).toBe(true)
  expect(isEnclosed(`"foo"`, [`'`])).toBe(false)
  expect(isEnclosed(`foo"`, [`"`])).toBe(false)
  expect(isEnclosed(`"foo`, [`"`])).toBe(false)
  expect(isEnclosed(`"foo" `, [`"`])).toBe(false)
  expect(isEnclosed(` "foo"`, [`"`])).toBe(false)
  expect(isEnclosed(`"foo'`, [`"`, `'`])).toBe(false)
})

test('global name validation', () => {
  expect(isGlobalName('$foo')).toBe(true)
  expect(isGlobalName('$fooBar')).toBe(true)
  expect(isGlobalName('$fooBarBaz')).toBe(true)
  expect(isGlobalName('$2foo')).toBe(true)
  expect(isGlobalName('$foo-bar')).toBe(false)
  expect(isGlobalName('$foo_bar')).toBe(false)
  expect(isGlobalName('$Foo')).toBe(false)
  expect(isGlobalName('$media')).toBe(false)
  expect(isGlobalName('$keyframes')).toBe(false)
  expect(isGlobalName('foo')).toBe(false)
})

test('page path validation', () => {
  expect(isPagePath('/')).toBe(true)
  expect(isPagePath('/foo')).toBe(true)
  expect(isPagePath('/foo/bar')).toBe(true)
  expect(isPagePath('/foo/bar/baz')).toBe(true)
  expect(isPagePath('/foo-bar')).toBe(true)
  expect(isPagePath('/foo-bar/baz')).toBe(true)
  expect(isPagePath('/1foo')).toBe(true)
  expect(isPagePath('/Foo')).toBe(false)
  expect(isPagePath('/foo_bar')).toBe(false)
  expect(isPagePath('foo')).toBe(false)
  expect(isPagePath('/-foo')).toBe(false)
  expect(isPagePath('/foo-')).toBe(false)
  expect(isPagePath('/$foo')).toBe(false)
})

test('property name validation', () => {
  expect(isPropertyName('foo')).toBe(true)
  expect(isPropertyName('foo_bar')).toBe(true)
  expect(isPropertyName('foo_bar_baz')).toBe(true)
  expect(isPropertyName('Foo')).toBe(false)
  expect(isPropertyName('foo-bar')).toBe(false)
  expect(isPropertyName('_foo')).toBe(false)
  expect(isPropertyName('foo_')).toBe(false)
  expect(isPropertyName('1foo')).toBe(false)
  expect(isPropertyName('$foo')).toBe(false)
  expect(isPropertyName('if')).toBe(false)
  expect(isPropertyName('into')).toBe(false)
  expect(isPropertyName('true')).toBe(false)
  expect(isPropertyName('false')).toBe(false)
  expect(isPropertyName('const')).toBe(false)
})

test('safe slug validation', () => {
  expect(isSafeSlug('foo')).toBe(true)
  expect(isSafeSlug('foo-bar')).toBe(true)
  expect(isSafeSlug('foo-bar-baz')).toBe(true)
  expect(isSafeSlug('foo1-bar1')).toBe(true)
  expect(isSafeSlug('Foo')).toBe(false)
  expect(isSafeSlug('foo--bar')).toBe(false)
  expect(isSafeSlug('fooBar')).toBe(false)
  expect(isSafeSlug('-foo')).toBe(false)
  expect(isSafeSlug('1foo')).toBe(false)
  expect(isSafeSlug('foo-')).toBe(false)
  expect(isSafeSlug('$foo')).toBe(false)
})

test('x-for directive validation', () => {
  expect(isXForDirective('(color, index) in colors')).toBe(true)
  expect(isXForDirective('color in colors')).toBe(true)
  expect(isXForDirective('(color) in colors')).toBe(true)
  expect(isXForDirective('(color, index) of colors')).toBe(true)
  expect(isXForDirective('color of colors')).toBe(true)
  expect(isXForDirective('(color) of colors')).toBe(true)
  expect(isXForDirective('color from colors')).toBe(false)
  expect(isXForDirective('colors')).toBe(false)
})
