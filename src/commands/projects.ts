import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, type OutputFormat } from "../output/formatter.js";
import { spinner, printError } from "../output/ui.js";

export function registerProjectsCommand(program: Command, configManager: ConfigManager): void {
  const projects = program.command("projects").description("Manage projects");

  projects
    .command("list")
    .description("List all projects")
    .action(async () => {
      const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
      try {
        const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
        const ctx = configManager.getContext(contextName);
        if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
        const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
        const client = new KanbanClient(ctx.url, token);
        const s = spinner("Fetching projects...");
        s.start();
        const data = await client.listProjects();
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "name"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
