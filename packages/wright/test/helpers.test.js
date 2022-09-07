import { filePathToPagePath, pagePathToFilePath } from '..'

test('filePathToPagePath', () => {
  expect(filePathToPagePath('foo.html')).toBe('/foo')
  expect(filePathToPagePath('foo/bar.html')).toBe('/foo/bar')
  expect(filePathToPagePath('index.html')).toBe('/')
  expect(filePathToPagePath('foo/index.html')).toBe('/foo')
  expect(filePathToPagePath('foo/bar/index.html')).toBe('/foo/bar')
  expect(filePathToPagePath('index/index.html')).toBe('/index')
  expect(filePathToPagePath('foo')).toBe(null)
  expect(filePathToPagePath('foo', true)).toBe('/foo')
})

test('pagePathToFilePath', () => {
  expect(pagePathToFilePath('/foo')).toBe('foo/index.html')
  expect(pagePathToFilePath('/foo/bar')).toBe('foo/bar/index.html')
  expect(pagePathToFilePath('/')).toBe('index.html')
  expect(pagePathToFilePath('/foo')).toBe('foo/index.html')
  expect(pagePathToFilePath('/foo/bar')).toBe('foo/bar/index.html')
  expect(pagePathToFilePath('/index')).toBe('index/index.html')
  expect(pagePathToFilePath('foo')).toBe(null)
  expect(pagePathToFilePath('foo', true)).toBe('foo/index.html')
})
