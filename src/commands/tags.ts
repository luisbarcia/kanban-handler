import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toIssueId, toTagId } from "../client/types.js";
import { ConfigError } from "../utils/errors.js";

/**
 * Register the `tags` command group on the root program.
 *
 * Exposes the following subcommands for managing issue tags:
 * - `tags list` — list all tags available in the active workspace.
 * - `tags add <issueId> <tagId>` — attach a tag to an issue.
 * - `tags remove <issueId> <tagId>` — detach a tag from an issue.
 *
 * @param program - The Commander root `Command` to attach the subcommand to.
 * @param configManager - Provides context and token resolution.
 */
export function registerTagsCommand(program: Command, configManager: ConfigManager): void {
  const tags = program.command("tags").description("Manage tags");

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

  tags.command("list").description("List all tags")
    .action(async () => {
      const s = spinner("Fetching tags...");
      try {
        const { client, opts } = getClientAndOpts();
        s.start();
        const data = await client.listTags();
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "name", "color"], opts.output));
      } catch (err) {
        s.stop();
        const opts = program.opts<{ verbose?: boolean }>();
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  tags.command("add <issueId> <tagId>").description("Add a tag to an issue")
    .action(async (issueId: string, tagId: string) => {
      const s = spinner("Adding tag...");
      try {
        const { client, opts } = getClientAndOpts();
        s.start();
        await client.addTag(toIssueId(issueId), toTagId(tagId));
        s.stop();
        console.log(color.success(`Tag ${tagId} added to issue ${issueId}.`));
      } catch (err) {
        s.stop();
        const opts = program.opts<{ verbose?: boolean }>();
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  tags.command("remove <issueId> <tagId>").description("Remove a tag from an issue")
    .action(async (issueId: string, tagId: string) => {
      const s = spinner("Removing tag...");
      try {
        const { client, opts } = getClientAndOpts();
        s.start();
        await client.removeTag(toIssueId(issueId), toTagId(tagId));
        s.stop();
        console.log(color.success(`Tag ${tagId} removed from issue ${issueId}.`));
      } catch (err) {
        s.stop();
        const opts = program.opts<{ verbose?: boolean }>();
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
