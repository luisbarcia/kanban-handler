import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toWorkspaceId, toSessionId } from "../client/types.js";

/**
 * Read all data from `process.stdin` and return it as a trimmed UTF-8 string.
 *
 * Intended for use when the caller wants to accept piped input (e.g. a prompt
 * message). The caller is responsible for verifying that stdin is not a TTY
 * before invoking this function.
 *
 * @returns The complete stdin contents, whitespace-trimmed.
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

/**
 * Register the `sessions` command group on the root program.
 *
 * Exposes the following subcommands for managing AI sessions within workspaces:
 * - `sessions list <workspaceId>` — list all sessions in a workspace.
 * - `sessions create <workspaceId>` — create a new session in a workspace.
 * - `sessions prompt <sessionId>` — send a prompt to a session; accepts the
 *   message via `--message` or from stdin when input is piped.
 *
 * @param program - The Commander root `Command` to attach the subcommand to.
 * @param configManager - Provides context and token resolution.
 */
export function registerSessionsCommand(program: Command, configManager: ConfigManager): void {
  const sessions = program.command("sessions").description("Manage sessions");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    return { client: new KanbanClient(ctx.url, token), opts };
  };

  sessions.command("list <workspaceId>").description("List sessions in a workspace")
    .action(async (workspaceId: string) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Fetching sessions..."); s.start();
        const data = await client.listSessions(toWorkspaceId(workspaceId)); s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "workspaceId", "status"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  sessions.command("create <workspaceId>").description("Create a new session in a workspace")
    .action(async (workspaceId: string) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Creating session..."); s.start();
        const session = await client.createSession(toWorkspaceId(workspaceId)); s.stop();
        console.log(color.success(`Session created: ${session.id}`));
        console.log(formatSingle(session as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  sessions.command("prompt <sessionId>").description("Send a prompt to a session")
    .option("--message <text>", "Prompt message (reads from stdin if not provided)")
    .action(async (sessionId: string, cmdOpts: { message?: string }) => {
      const { client, opts } = getClientAndOpts();
      try {
        let message: string;
        if (cmdOpts.message) {
          message = cmdOpts.message;
        } else {
          if (process.stdin.isTTY) {
            printError("No --message provided and stdin is a TTY. Pipe input or use --message.");
            process.exit(1);
          }
          message = await readStdin();
          if (!message) { printError("Empty input from stdin."); process.exit(1); }
        }
        const s = spinner("Sending prompt..."); s.start();
        const execution = await client.runSessionPrompt(toSessionId(sessionId), message); s.stop();
        console.log(formatSingle(execution as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
