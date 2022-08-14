/**
 * Delete all entries of an `object`.
 *
 * @example
 * clearObject({ foo: 'bar' }) // {}
 */
export function clearObject<T extends object>(object: T): T {
  if (Array.isArray(object)) {
    object.splice(0, object.length)
  } else if (object && typeof object === 'object') {
    for (const property of Object.getOwnPropertyNames(object)) {
      delete object[property]
    }
  }

  return object
}

/**
 * Fill in missing entries in `object1` with entries from `object2`.
 *
 * @example
 * fillObject({ foo: 'bar' }, { foo: 'baz', bar: 'baz' }) // { foo: 'bar', bar: 'baz' }
 */
export function fillObject<T extends object>(object1: T, object2: T): T {
  Object.entries(object2).forEach(([key, defaultValue]) => {
    if (!object1.hasOwnProperty(key)) {
      object1[key] = defaultValue
    }
  })

  return object1
}
