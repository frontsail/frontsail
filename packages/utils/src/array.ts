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
 * Remove duplicate values from an `array`.
 *
 * @example
 * uniqueArray(['foo', 'foo', 'bar']) // ['foo', 'bar']
 */
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)]
}
