import Table from "cli-table3";
import { color } from "./ui.js";

export type OutputFormat = "table" | "json" | "minimal";

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
