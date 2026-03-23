// src/cli.test.ts
import { describe, it, expect } from "vitest";
import { createProgram } from "./cli.js";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

describe("CLI", () => {
  it("parses --version", async () => {
    const program = createProgram();
    let output = "";
    program.configureOutput({ writeOut: (str) => { output = str; } });
    try {
      await program.parseAsync(["node", "kanban", "--version"]);
    } catch {
      // commander throws on --version with exitOverride
    }
    expect(output.trim()).toBe(pkg.version);
  });

  it("registers all top-level commands", () => {
    const program = createProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toContain("health");
    expect(names).toContain("config");
    expect(names).toContain("issues");
    expect(names).toContain("projects");
    expect(names).toContain("tags");
    expect(names).toContain("workspaces");
    expect(names).toContain("sessions");
  });
});
