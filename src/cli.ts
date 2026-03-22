import { Command } from "commander";
import { ConfigManager } from "./config/manager.js";
import { registerHealthCommand } from "./commands/health.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerProjectsCommand } from "./commands/projects.js";
import { registerIssuesCommand } from "./commands/issues.js";
import { registerTagsCommand } from "./commands/tags.js";
import { registerWorkspacesCommand } from "./commands/workspaces.js";
import { registerSessionsCommand } from "./commands/sessions.js";
import { printError, setNoColor } from "./output/ui.js";

export function createProgram(): Command {
  const program = new Command();
  const configManager = ConfigManager.create();

  program
    .name("kanban")
    .description("CLI for managing Vibe Kanban boards on self-hosted instances")
    .version("0.1.0")
    .option("--context <name>", "Override active context")
    .option("--token <jwt>", "Override authentication token")
    .option("--output <format>", "Output format: table, json, minimal", "table")
    .option("--no-color", "Disable colored output")
    .option("--verbose", "Enable verbose output");

  registerHealthCommand(program, configManager);
  registerConfigCommand(program, configManager);
  registerProjectsCommand(program, configManager);
  registerIssuesCommand(program, configManager);
  registerTagsCommand(program, configManager);
  registerWorkspacesCommand(program, configManager);
  registerSessionsCommand(program, configManager);

  // Apply --no-color before any command runs
  program.hook("preAction", () => {
    const opts = program.opts<{ color?: boolean }>();
    if (opts.color === false) setNoColor(true);
  });

  program.exitOverride();
  program.configureOutput({
    writeErr: (str) => printError(str.trim()),
  });

  return program;
}
