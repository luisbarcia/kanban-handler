import type { Command } from "commander";
import { KanbanClient } from "../client/api-client.js";
import { ConfigManager } from "../config/manager.js";
import { spinner, color, printError } from "../output/ui.js";
import type { OutputFormat } from "../output/formatter.js";

export function registerHealthCommand(program: Command, configManager: ConfigManager): void {
  program
    .command("health")
    .description("Check connectivity with the active Vibe Kanban instance")
    .action(async () => {
      const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
      const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
      const ctx = configManager.getContext(contextName);

      if (!ctx) {
        printError(`Context '${contextName}' not found.`, "Use 'kanban config add-context' to add one.");
        process.exit(5);
      }

      const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
      const client = new KanbanClient(ctx.url, token);
      const s = spinner("Checking health...");
      s.start();

      try {
        const status = await client.health();
        s.stop();
        if (status.ok) {
          console.log(color.success(`Connected to ${ctx.url}`));
          if (status.version) console.log(color.dim(`Version: ${status.version}`));
        } else {
          console.log(color.warn(`Instance responded but reported unhealthy`));
        }
      } catch (err) {
        s.stop();
        if (err instanceof Error) {
          printError(err.message);
          if (opts.verbose) console.error(err.stack);
        }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
