/**
 * Attack Taxonomy tests for formatter.
 *
 * Covers: Input Attacks (empty arrays, null/undefined values, missing columns),
 * Edge Cases (single item, empty object, large datasets).
 * DO NOT modify source files — test only.
 */
import { describe, it, expect } from "vitest";
import { formatOutput, formatSingle } from "./formatter.js";

describe("formatOutput — Attack Taxonomy", () => {
  // ─── Input Attacks — empty arrays ────────────────────────────────

  describe("Input Attacks — empty arrays", () => {
    it("json format with empty array returns '[]'", () => {
      const out = formatOutput([], ["id", "title"], "json");
      expect(JSON.parse(out)).toEqual([]);
    });

    it("minimal format with empty array returns empty string", () => {
      const out = formatOutput([], ["id", "title"], "minimal");
      expect(out).toBe("");
    });

    it("table format with empty array still shows headers", () => {
      const out = formatOutput([], ["id", "title", "status"], "table");
      expect(out).toContain("id");
      expect(out).toContain("title");
      expect(out).toContain("status");
    });

    it("default format with empty array produces a string", () => {
      const out = formatOutput([], ["id"]);
      expect(typeof out).toBe("string");
    });
  });

  // ─── Input Attacks — missing columns / undefined values ───────────

  describe("Input Attacks — missing columns and undefined values", () => {
    it("table format falls back to empty string for missing column keys", () => {
      const items = [{ id: "i1" }]; // no 'title' or 'status' fields
      const out = formatOutput(items, ["id", "title", "status"], "table");
      // should not throw and should show 'i1'
      expect(out).toContain("i1");
    });

    it("minimal format falls back to empty string when first column is missing", () => {
      const items = [{ name: "Alice" }]; // no 'id'
      const out = formatOutput(items, ["id", "name"], "minimal");
      expect(out).toBe(""); // items[0]['id'] is undefined → String(undefined ?? '') = ''
    });

    it("table format with null value falls back to empty string", () => {
      const items = [{ id: "i1", title: null as unknown as string }];
      const out = formatOutput(items, ["id", "title"], "table");
      expect(out).toContain("i1");
      // null ?? "" → "", so title cell is empty string
      expect(out).not.toContain("null");
    });

    it("table format with undefined value falls back to empty string", () => {
      const items = [{ id: "i1", title: undefined as unknown as string }];
      const out = formatOutput(items, ["id", "title"], "table");
      expect(out).toContain("i1");
      expect(out).not.toContain("undefined");
    });

    it("json format preserves null values", () => {
      const items = [{ id: "i1", title: null }];
      const out = formatOutput(items as Record<string, unknown>[], ["id", "title"], "json");
      const parsed = JSON.parse(out);
      expect(parsed[0].title).toBeNull();
    });

    it("minimal format with numeric value converts to string", () => {
      const items = [{ count: 42 }];
      const out = formatOutput(items as Record<string, unknown>[], ["count"], "minimal");
      expect(out).toBe("42");
    });

    it("minimal format with boolean true converts to string", () => {
      const items = [{ active: true }];
      const out = formatOutput(items as Record<string, unknown>[], ["active"], "minimal");
      expect(out).toBe("true");
    });

    it("minimal format with false value converts to string", () => {
      const items = [{ active: false }];
      const out = formatOutput(items as Record<string, unknown>[], ["active"], "minimal");
      expect(out).toBe("false");
    });
  });

  // ─── Input Attacks — single item ─────────────────────────────────

  describe("Input Attacks — single item", () => {
    it("minimal format with single item has no newlines", () => {
      const items = [{ id: "i1", title: "only one" }];
      const out = formatOutput(items, ["id", "title"], "minimal");
      expect(out).toBe("i1");
      expect(out).not.toContain("\n");
    });

    it("json format with single item is still an array", () => {
      const items = [{ id: "i1" }];
      const out = formatOutput(items, ["id"], "json");
      const parsed = JSON.parse(out);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });
  });

  // ─── Input Attacks — empty columns array ─────────────────────────

  describe("Input Attacks — empty columns array", () => {
    it("table format with empty columns array does not throw", () => {
      const items = [{ id: "i1", title: "test" }];
      expect(() => formatOutput(items, [], "table")).not.toThrow();
    });

    it("minimal format with empty columns array returns empty string", () => {
      const items = [{ id: "i1" }];
      // columns[0] is undefined → item[undefined] → undefined ?? "" → ""
      const out = formatOutput(items, [], "minimal");
      expect(out).toBe("");
    });
  });

  // ─── Boundary Values — large datasets ────────────────────────────

  describe("Boundary Values — large datasets", () => {
    it("minimal format with many items joins with newline", () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: `i${i}` }));
      const out = formatOutput(items, ["id"], "minimal");
      const lines = out.split("\n");
      expect(lines).toHaveLength(100);
      expect(lines[0]).toBe("i0");
      expect(lines[99]).toBe("i99");
    });

    it("json format with many items produces valid JSON array", () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `i${i}`, name: `Name ${i}` }));
      const out = formatOutput(items, ["id", "name"], "json");
      const parsed = JSON.parse(out);
      expect(parsed).toHaveLength(50);
    });
  });

  // ─── Input Attacks — special string values ────────────────────────

  describe("Input Attacks — special string values", () => {
    it("json format handles items with empty string values", () => {
      const items = [{ id: "", title: "" }];
      const out = formatOutput(items, ["id", "title"], "json");
      const parsed = JSON.parse(out);
      expect(parsed[0].id).toBe("");
    });

    it("table format handles items with newline characters in values", () => {
      const items = [{ id: "i1", title: "line1\nline2" }];
      // Should not throw — the value is converted to string
      expect(() => formatOutput(items, ["id", "title"], "table")).not.toThrow();
    });
  });
});

describe("formatSingle — Attack Taxonomy", () => {
  // ─── Input Attacks — empty object ────────────────────────────────

  describe("Input Attacks — empty object", () => {
    it("json format with empty object returns '{}'", () => {
      const out = formatSingle({}, "json");
      expect(JSON.parse(out)).toEqual({});
    });

    it("minimal format with empty object returns empty string", () => {
      const out = formatSingle({}, "minimal");
      expect(out).toBe("");
    });

    it("table format with empty object returns empty string", () => {
      const out = formatSingle({}, "table");
      expect(out).toBe("");
    });
  });

  // ─── Input Attacks — undefined/null values ────────────────────────

  describe("Input Attacks — undefined and null values", () => {
    it("table format with null value shows empty string (not 'null')", () => {
      const out = formatSingle({ id: "i1", title: null as unknown as string }, "table");
      expect(out).not.toContain("null");
      expect(out).toContain("id");
    });

    it("table format with undefined value shows empty string (not 'undefined')", () => {
      const out = formatSingle({ id: "i1", description: undefined }, "table");
      expect(out).not.toContain("undefined");
    });

    it("minimal format with undefined first value returns empty string", () => {
      const out = formatSingle({ description: undefined }, "minimal");
      expect(out).toBe("");
    });

    it("minimal format with null first value returns empty string", () => {
      const out = formatSingle({ title: null as unknown as string }, "minimal");
      expect(out).toBe("");
    });
  });

  // ─── Input Attacks — single key object ───────────────────────────

  describe("Input Attacks — single key object", () => {
    it("table format with single key shows key and value", () => {
      const out = formatSingle({ status: "active" }, "table");
      expect(out).toContain("status");
      expect(out).toContain("active");
    });

    it("minimal format with single key returns the value", () => {
      const out = formatSingle({ status: "active" }, "minimal");
      expect(out).toBe("active");
    });
  });

  // ─── Input Attacks — numeric values ──────────────────────────────

  describe("Input Attacks — numeric and boolean values", () => {
    it("table format with numeric value converts to string", () => {
      const out = formatSingle({ count: 42 } as Record<string, unknown>, "table");
      expect(out).toContain("42");
    });

    it("table format with boolean value converts to string", () => {
      const out = formatSingle({ active: true } as Record<string, unknown>, "table");
      expect(out).toContain("true");
    });

    it("minimal format returns first value as string for number", () => {
      const out = formatSingle({ count: 0 } as Record<string, unknown>, "minimal");
      expect(out).toBe("0");
    });
  });

  // ─── Default format fallback ──────────────────────────────────────

  describe("Default format", () => {
    it("formatSingle defaults to table format", () => {
      const out = formatSingle({ id: "i1", title: "Test" });
      expect(out).toContain("id");
      expect(out).toContain("i1");
      expect(out).toContain("title");
    });
  });
});
