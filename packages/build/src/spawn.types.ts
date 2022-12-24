export interface SpawnOptions {
  /**
   * The command to run.
   */
  command: string

  /**
   * Whether to stream the output to the console.
   *
   * Defaults to `false`.
   */
  showOutput?: boolean

  /**
   * A text prefix for every output line.
   *
   * Defaults to an empty string.
   */
  outputPrefix?: string
}
