/**
 * Collection of debounced callbacks.
 */
const debounced = {}

/**
 * Force a `callback` to wait a certain amount of time before running again.
 * The callbacks are identified by an `id`, so they can be called in parallel.
 */
export async function debounce(
  id: string,
  callback: (...args: string[]) => any | Promise<any>,
  delay: number | false = 150,
): Promise<void> {
  if (debounced[id]) {
    clearTimeout(debounced[id])
    delete debounced[id]
  }

  if (delay !== false) {
    debounced[id] = setTimeout(() => {
      delete debounced[id]
      callback()
    }, delay)
  } else {
    await callback()
  }
}
