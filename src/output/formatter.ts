import Table from "cli-table3";
import { color } from "./ui.js";

/**
 * Supported output formats for CLI commands.
 *
 * - `"table"` — human-readable ASCII table with bold headers (default).
 * - `"json"` — pretty-printed JSON, suitable for piping to `jq`.
 * - `"minimal"` — plain text with one value per line; useful for scripting.
 */
export type OutputFormat = "table" | "json" | "minimal";

/**
 * Format a list of records for CLI output.
 *
 * Renders the provided items using the requested format. For `"table"` and
 * `"minimal"`, only the fields listed in `columns` are included; `"json"`
 * serialises the full item objects.
 *
 * @param items - Array of data records to render.
 * @param columns - Ordered list of property names to display. For `"minimal"`,
 *   only the first column is used.
 * @param format - Output format; defaults to `"table"`.
 * @returns The formatted string ready to be written to stdout.
 *
 * @example
 * console.log(formatOutput(projects, ["id", "name"], "table"));
 * console.log(formatOutput(projects, ["id", "name"], "json"));
 */
export function formatOutput(
  items: Record<string, unknown>[],
  columns: string[],
  format: OutputFormat = "table",
): string {
  switch (format) {
    case "json":
      return JSON.stringify(items, null, 2);
    case "minimal":
      return items.map((item) => String(item[columns[0]!] ?? "")).join("\n");
    case "table": {
      const table = new Table({
        head: columns.map((c) => color.bold(c)),
        style: { head: [], border: [] },
      });
      for (const item of items) {
        table.push(columns.map((c) => String(item[c] ?? "")));
      }
      return table.toString();
    }
  }
}

/**
 * Format a single record for CLI output.
 *
 * For `"table"` mode each key-value pair is rendered as `bold(key): value` on
 * its own line. `"json"` serialises the whole object; `"minimal"` returns only
 * the first value as a plain string.
 *
 * @param item - The data record to render.
 * @param format - Output format; defaults to `"table"`.
 * @returns The formatted string ready to be written to stdout.
 *
 * @example
 * console.log(formatSingle(issue, opts.output));
 */
export function formatSingle(
  item: Record<string, unknown>,
  format: OutputFormat = "table",
): string {
  if (format === "json") return JSON.stringify(item, null, 2);
  if (format === "minimal") return String(Object.values(item)[0] ?? "");

  return Object.entries(item)
    .map(([key, value]) => `${color.bold(key)}: ${String(value ?? "")}`)
    .join("\n");
}
