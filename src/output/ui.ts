import chalk from "chalk";
import ora, { type Ora } from "ora";

let forceNoColor = false;

/**
 * Globally disable or re-enable colored and TTY-gated output.
 *
 * @param value - When `true`, all color helpers and the spinner become no-ops
 *   regardless of whether stdout is a TTY. Typically set by the `--no-color`
 *   CLI flag before any command runs.
 */
export function setNoColor(value: boolean): void { forceNoColor = value; }
const isTTY = (): boolean => !forceNoColor && (process.stdout.isTTY ?? false);

/**
 * Chalk-backed color helpers that degrade gracefully to plain text when stdout
 * is not a TTY or when {@link setNoColor} has been called with `true`.
 *
 * Each property is a function that accepts a string and returns either the
 * chalk-styled version or the original string unchanged.
 *
 * @example
 * console.log(color.success("Done!"));
 * console.log(color.error("Something went wrong."));
 */
export const color = {
  success: (text: string) => (isTTY() ? chalk.green(text) : text),
  error: (text: string) => (isTTY() ? chalk.red(text) : text),
  warn: (text: string) => (isTTY() ? chalk.yellow(text) : text),
  dim: (text: string) => (isTTY() ? chalk.dim(text) : text),
  bold: (text: string) => (isTTY() ? chalk.bold(text) : text),
};

/**
 * Create an `ora` spinner with the given label.
 *
 * The spinner is silenced automatically when stdout is not a TTY (e.g. when
 * output is piped), so callers can always call `.start()` / `.stop()` without
 * extra guards.
 *
 * @param text - The label displayed next to the spinner animation.
 * @returns An `Ora` spinner instance ready to be started.
 *
 * @example
 * const s = spinner("Loading...");
 * s.start();
 * await doWork();
 * s.stop();
 */
export function spinner(text: string): Ora {
  return ora({ text, isSilent: !isTTY() });
}

/**
 * Print a formatted error message (and optional hint) to stderr.
 *
 * The message is prefixed with `"Error: "` and colored red when the output is
 * a TTY. If a suggestion is provided it is printed on the next line, dimmed,
 * with a `"Hint: "` prefix.
 *
 * @param message - The primary error description.
 * @param suggestion - Optional follow-up hint to help the user recover.
 *
 * @example
 * printError("Context not found.", "Use 'kanban config add-context' to add one.");
 */
export function printError(message: string, suggestion?: string): void {
  console.error(color.error(`Error: ${message}`));
  if (suggestion) {
    console.error(color.dim(`Hint: ${suggestion}`));
  }
}
