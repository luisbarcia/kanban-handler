import type { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toIssueId, toWorkspaceId } from "../client/types.js";

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(`${message} (y/N) `);
  rl.close();
  return answer.toLowerCase() === "y";
}

export function registerWorkspacesCommand(program: Command, configManager: ConfigManager): void {
  const workspaces = program.command("workspaces").description("Manage workspaces");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    return { client: new KanbanClient(ctx.url, token), opts };
  };

  workspaces.command("list").description("List all workspaces")
    .action(async () => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Fetching workspaces..."); s.start();
        const data = await client.listWorkspaces(); s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "issueId", "status"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  workspaces.command("start <issueId>").description("Start a new workspace for an issue")
    .action(async (issueId: string) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Starting workspace..."); s.start();
        const ws = await client.startWorkspace(toIssueId(issueId)); s.stop();
        console.log(color.success(`Workspace created: ${ws.id}`));
        console.log(formatSingle(ws as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  workspaces.command("delete <id>").description("Delete a workspace")
    .option("--force", "Skip confirmation")
    .action(async (id: string, cmdOpts: { force?: boolean }) => {
      const { client, opts } = getClientAndOpts();
      try {
        if (!cmdOpts.force) {
          const ok = await confirm(`Delete workspace ${id}?`);
          if (!ok) { console.log("Aborted."); return; }
        }
        const s = spinner("Deleting workspace..."); s.start();
        await client.deleteWorkspace(toWorkspaceId(id)); s.stop();
        console.log(color.success(`Workspace ${id} deleted.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
