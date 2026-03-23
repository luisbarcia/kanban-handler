import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toIssueId, toWorkspaceId } from "../client/types.js";
import { ConfigError } from "../utils/errors.js";
import { confirm } from "../utils/prompt.js";

/**
 * Register the `workspaces` command group on the root program.
 *
 * Exposes the following subcommands for managing workspaces:
 * - `workspaces list` — list all workspaces with their associated issue and status.
 * - `workspaces start <issueId>` — create a new workspace linked to an issue.
 * - `workspaces delete <id>` — delete a workspace (prompts for confirmation unless `--force`).
 *
 * @param program - The Commander root `Command` to attach the subcommand to.
 * @param configManager - Provides context and token resolution.
 */
export function registerWorkspacesCommand(program: Command, configManager: ConfigManager): void {
  const workspaces = program.command("workspaces").description("Manage workspaces");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) {
      throw new ConfigError(`Context '${contextName}' not found. Use 'kanban config add-context' to add one.`);
    }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    return { client: new KanbanClient(ctx.url, token), opts };
  };

  workspaces.command("list").description("List all workspaces")
    .action(async () => {
      const s = spinner("Fetching workspaces...");
      try {
        const { client, opts } = getClientAndOpts();
        s.start();
        const data = await client.listWorkspaces();
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "issueId", "status"], opts.output));
      } catch (err) {
        s.stop();
        const opts = program.opts<{ verbose?: boolean }>();
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  workspaces.command("start <issueId>").description("Start a new workspace for an issue")
    .action(async (issueId: string) => {
      const s = spinner("Starting workspace...");
      try {
        const { client, opts } = getClientAndOpts();
        s.start();
        const ws = await client.startWorkspace(toIssueId(issueId));
        s.stop();
        console.log(color.success(`Workspace created: ${ws.id}`));
        console.log(formatSingle(ws as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        s.stop();
        const opts = program.opts<{ verbose?: boolean }>();
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  workspaces.command("delete <id>").description("Delete a workspace")
    .option("--force", "Skip confirmation")
    .action(async (id: string, cmdOpts: { force?: boolean }) => {
      const s = spinner("Deleting workspace...");
      try {
        const { client } = getClientAndOpts();
        if (!cmdOpts.force) {
          const ok = await confirm(`Delete workspace ${id}?`);
          if (!ok) { console.log("Aborted."); return; }
        }
        s.start();
        await client.deleteWorkspace(toWorkspaceId(id));
        s.stop();
        console.log(color.success(`Workspace ${id} deleted.`));
      } catch (err) {
        s.stop();
        const opts = program.opts<{ verbose?: boolean }>();
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
