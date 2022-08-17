/**
 * Generates a tuple from keys in object `T` to be used in rest parameters.
 * A wildcard (`*`) is also mixed with the keys to indicate batch operations.
 *
 * @example
 * foo(...bar: AtLeastOne<Baz>)
 */
export type AtLeastOne<T extends object> = [WithWildcard<T>, ...(keyof T)[]]

/**
 * Generates a type from keys in object `T` and wildcard (`*`) that stands for
 * all keys.
 *
 * @example
 * foo(...bar: WithWildcard<Baz>)
 */
export type WithWildcard<T extends object> = keyof T | '*'
