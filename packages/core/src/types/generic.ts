/**
 * Generates a tuple from keys in object `T` to be used in rest parameters.
 * A wildcard (`*`) is also mixed with the keys to indicate batch operations.
 *
 * @example
 * foo(...bar: AtLeastOne<Baz>)
 */
export type AtLeastOne<T extends object> = [keyof T | '*', ...(keyof T | '*')[]]
