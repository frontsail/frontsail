import { clearObject } from './object'

/**
 * Remove all elements from an `array`.
 *
 * @example
 * clearArray(['foo']) // []
 */
export function clearArray<T>(array: T[]): T[] {
  return clearObject(array)
}

/**
 * Check if two arrays have identical unique values.
 *
 * @example
 * compareArrays(['foo', 'foo', 'bar'], ['bar', 'foo']) // true
 */
export function compareArrays(array1: any[], array2: any[]): boolean {
  return uniqueArray(array1).length === intersectArrays(array1, array2).length
}

/**
 * Get the unique difference between two arrays.
 *
 * @example
 * diffArrays(['foo'], ['bar', 'bar']) // ['foo', 'bar']
 */
export function diffArrays<T>(array1: T[], array2: T[]): T[] {
  return uniqueArray(
    array1
      .filter((item) => !array2.includes(item))
      .concat(array2.filter((item) => !array1.includes(item))),
  )
}

/**
 * Compute the intersection of two arrays. Duplicated values are removed from
 * the returned array.
 *
 * @example
 * intersectArrays(['foo', 'foo', 'bar'], ['foo', 'foo']) // ['foo']
 */
export function intersectArrays<T>(array1: T[], array2: T[]): T[] {
  return uniqueArray(array1.filter((value) => array2.includes(value)))
}

/**
 * Get the last element of a non-empty array.
 *
 * @example
 * last(['foo', 'bar', baz']) // 'baz'
 */
export function last<T>(array: T[]): T {
  return array[array.length - 1]
}

/**
 * Get the element at index `n` of an `array`. If `n` is negative, the nth element
 * from the end is returned.
 *
 * @example
 * nth(['foo', bar'], 2) // 'foo'
 */
export function nth<T>(array: T[], n: number): T {
  return array[nthIndex(array, n)]
}

/**
 * Get the normalized index at index `n` of an `array`. If `n` is negative, the nth normalized
 * index from the end is returned.
 *
 * @example
 * nth(['foo', bar'], 2) // 0
 */
export function nthIndex<T>(array: T[], n: number): number {
  n = n % array.length
  n += n < 0 ? array.length : 0

  return n
}

/**
 * Remove duplicate values from an `array`.
 *
 * @example
 * uniqueArray(['foo', 'foo', 'bar']) // ['foo', 'bar']
 */
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)]
}
