import { describe, it, expect } from "vitest";
import { formatOutput, formatSingle } from "./formatter.js";

describe("formatOutput", () => {
  const items = [
    { id: "i1", title: "Bug fix", status: "open" },
    { id: "i2", title: "Feature", status: "done" },
  ];
  const columns = ["id", "title", "status"] as const;

  it("json format outputs valid JSON", () => {
    const out = formatOutput(items, [...columns], "json");
    expect(JSON.parse(out)).toEqual(items);
  });

  it("minimal format outputs one id per line", () => {
    const out = formatOutput(items, [...columns], "minimal");
    expect(out).toBe("i1\ni2");
  });

  it("table format contains column headers", () => {
    const out = formatOutput(items, [...columns], "table");
    expect(out).toContain("id");
    expect(out).toContain("title");
    expect(out).toContain("status");
    expect(out).toContain("Bug fix");
  });

  it("defaults to table format", () => {
    const out = formatOutput(items, [...columns]);
    expect(out).toContain("Bug fix");
  });
});

describe("formatSingle", () => {
  const item = { id: "i1", title: "Bug fix", status: "open" };

  it("json format", () => {
    const out = formatSingle(item, "json");
    expect(JSON.parse(out)).toEqual(item);
  });

  it("minimal format returns first value", () => {
    const out = formatSingle(item, "minimal");
    expect(out).toBe("i1");
  });

  it("table format shows key-value pairs", () => {
    const out = formatSingle(item, "table");
    expect(out).toContain("id");
    expect(out).toContain("i1");
  });
});
