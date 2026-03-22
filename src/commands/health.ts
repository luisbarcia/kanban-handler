import type { Command } from "commander";
import { KanbanClient } from "../client/api-client.js";
import { ConfigManager } from "../config/manager.js";
import { spinner, color, printError } from "../output/ui.js";
import type { OutputFormat } from "../output/formatter.js";

/**
 * Register the `health` command on the root program.
 *
 * The command pings the active Vibe Kanban instance and reports connectivity
 * status. It exits with code `5` when the configured context is missing, or
 * with the API error's exit code (defaulting to `1`) on network failure.
 *
 * @param program - The Commander root `Command` to attach the subcommand to.
 * @param configManager - Provides context resolution and token lookup.
 */
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
