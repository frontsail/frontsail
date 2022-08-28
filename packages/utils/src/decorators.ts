/**
 * Create a new function that, when called, has its `this` keyword set to the
 * provided value, with a given sequence of arguments preceding any provided
 * when the new function is called.
 */
export function bind<T extends (...args: any[]) => any>(
  _target: object,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> | void {
  return {
    configurable: true,
    get(this: T): T {
      const bound: T = descriptor!.value!.bind(this) as T

      Object.defineProperty(this, propertyKey, {
        value: bound,
        configurable: true,
        writable: true,
      })

      return bound
    },
  }
}
