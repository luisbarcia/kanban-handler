import type { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toProjectId, toIssueId, toMemberId } from "../client/types.js";
import type { IssueFilters } from "../client/types.js";

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(`${message} (y/N) `);
  rl.close();
  return answer.toLowerCase() === "y";
}

function resolveProjectId(opts: { project?: string }, configManager: ConfigManager): string {
  if (opts.project) return opts.project;
  const ctx = configManager.getCurrentContext();
  if (ctx.defaultProject) return ctx.defaultProject;
  printError("No project specified. Use --project or set a defaultProject in your context.");
  process.exit(5);
}

export function registerIssuesCommand(program: Command, configManager: ConfigManager): void {
  const issues = program.command("issues").description("Manage issues");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    const client = new KanbanClient(ctx.url, token);
    return { client, opts };
  };

  issues.command("list").description("List issues in a project")
    .option("--project <id>", "Project ID")
    .option("--status <status>", "Filter by status")
    .option("--assignee <id>", "Filter by assignee")
    .option("--limit <n>", "Items per page", parseInt)
    .option("--page <n>", "Page number", parseInt)
    .action(async (cmdOpts: { project?: string; status?: string; assignee?: string; limit?: number; page?: number }) => {
      const { client, opts } = getClientAndOpts();
      try {
        const projectId = resolveProjectId(cmdOpts, configManager);
        const filters: IssueFilters = {};
        if (cmdOpts.status) filters.status = cmdOpts.status;
        if (cmdOpts.assignee) filters.assignee = toMemberId(cmdOpts.assignee);
        const pagination: import("../client/types.js").PaginationParams = {};
        if (cmdOpts.limit !== undefined) pagination.limit = cmdOpts.limit;
        if (cmdOpts.page !== undefined) pagination.page = cmdOpts.page;
        const s = spinner("Fetching issues..."); s.start();
        const data = await client.listIssues(toProjectId(projectId), filters, pagination);
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "title", "status", "priority"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues.command("create").description("Create a new issue")
    .requiredOption("--title <title>", "Issue title")
    .option("--project <id>", "Project ID")
    .option("--description <text>", "Issue description")
    .option("--priority <level>", "Priority level")
    .option("--status <status>", "Initial status")
    .action(async (cmdOpts: { title: string; project?: string; description?: string; priority?: string; status?: string }) => {
      const { client, opts } = getClientAndOpts();
      try {
        const projectId = resolveProjectId(cmdOpts, configManager);
        const createInput: import("../client/types.js").CreateIssueInput = { title: cmdOpts.title };
        if (cmdOpts.description !== undefined) createInput.description = cmdOpts.description;
        if (cmdOpts.priority !== undefined) createInput.priority = cmdOpts.priority;
        if (cmdOpts.status !== undefined) createInput.status = cmdOpts.status;
        const s = spinner("Creating issue..."); s.start();
        const issue = await client.createIssue(toProjectId(projectId), createInput);
        s.stop();
        console.log(color.success(`Issue created: ${issue.id}`));
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues.command("get <id>").description("Get issue details")
    .action(async (id: string) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Fetching issue..."); s.start();
        const issue = await client.getIssue(toIssueId(id));
        s.stop();
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues.command("update <id>").description("Update an issue")
    .option("--title <title>", "New title")
    .option("--description <text>", "New description")
    .option("--priority <level>", "New priority")
    .option("--status <status>", "New status")
    .action(async (id: string, cmdOpts: { title?: string; description?: string; priority?: string; status?: string }) => {
      const { client, opts } = getClientAndOpts();
      try {
        const updateInput: import("../client/types.js").UpdateIssueInput = {};
        if (cmdOpts.title !== undefined) updateInput.title = cmdOpts.title;
        if (cmdOpts.description !== undefined) updateInput.description = cmdOpts.description;
        if (cmdOpts.priority !== undefined) updateInput.priority = cmdOpts.priority;
        if (cmdOpts.status !== undefined) updateInput.status = cmdOpts.status;
        const s = spinner("Updating issue..."); s.start();
        const issue = await client.updateIssue(toIssueId(id), updateInput);
        s.stop();
        console.log(color.success(`Issue ${id} updated.`));
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues.command("delete <id>").description("Delete an issue")
    .option("--force", "Skip confirmation")
    .action(async (id: string, cmdOpts: { force?: boolean }) => {
      const { client, opts } = getClientAndOpts();
      try {
        if (!cmdOpts.force) {
          const ok = await confirm(`Delete issue ${id}?`);
          if (!ok) { console.log("Aborted."); return; }
        }
        const s = spinner("Deleting issue..."); s.start();
        await client.deleteIssue(toIssueId(id));
        s.stop();
        console.log(color.success(`Issue ${id} deleted.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues.command("assign <issueId> <memberId>").description("Assign a member to an issue")
    .action(async (issueId: string, memberId: string) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Assigning..."); s.start();
        await client.assignIssue(toIssueId(issueId), toMemberId(memberId));
        s.stop();
        console.log(color.success(`Member ${memberId} assigned to issue ${issueId}.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues.command("unassign <issueId> <memberId>").description("Unassign a member from an issue")
    .action(async (issueId: string, memberId: string) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Unassigning..."); s.start();
        await client.unassignIssue(toIssueId(issueId), toMemberId(memberId));
        s.stop();
        console.log(color.success(`Member ${memberId} unassigned from issue ${issueId}.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues.command("move <id> <status>").description("Move issue to a new status")
    .action(async (id: string, status: string) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Moving issue..."); s.start();
        const issue = await client.moveIssue(toIssueId(id), status);
        s.stop();
        console.log(color.success(`Issue ${id} moved to '${status}'.`));
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
