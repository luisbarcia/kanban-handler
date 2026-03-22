import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { color, printError } from "../output/ui.js";

export function registerConfigCommand(program: Command, configManager: ConfigManager): void {
  const config = program.command("config").description("Manage Vibe Kanban contexts");

  config
    .command("add-context <name>")
    .description("Add a new context")
    .requiredOption("--url <url>", "Instance URL")
    .requiredOption("--token <token>", "JWT token")
    .option("--default-project <id>", "Default project ID")
    .action((name: string, opts: { url: string; token: string; defaultProject?: string }) => {
      const ctx: import("../config/manager.js").ContextConfig = { url: opts.url, token: opts.token };
      if (opts.defaultProject !== undefined) ctx.defaultProject = opts.defaultProject;
      configManager.addContext(name, ctx);
      console.log(color.success(`Context '${name}' added.`));
    });

  config
    .command("use-context <name>")
    .description("Set active context")
    .action((name: string) => {
      try {
        configManager.useContext(name);
        console.log(color.success(`Switched to context '${name}'.`));
      } catch (err) {
        if (err instanceof Error) printError(err.message);
        process.exit(5);
      }
    });

  config
    .command("list-contexts")
    .description("List all contexts")
    .action(() => {
      const format = program.opts<{ output?: OutputFormat }>().output ?? "table";
      const current = configManager.getCurrentContextName();
      const contexts = configManager.listContexts().map((name) => {
        const ctx = configManager.getContext(name)!;
        return { name, url: ctx.url, active: name === current ? "*" : "" };
      });
      console.log(formatOutput(contexts, ["active", "name", "url"], format));
    });

  config
    .command("remove-context <name>")
    .description("Remove a context")
    .action((name: string) => {
      configManager.removeContext(name);
      console.log(color.success(`Context '${name}' removed.`));
    });

  config
    .command("show")
    .description("Show active context details")
    .action(() => {
      try {
        const format = program.opts<{ output?: OutputFormat }>().output ?? "table";
        const info = configManager.showCurrentContext();
        console.log(formatSingle(info as unknown as Record<string, unknown>, format));
      } catch (err) {
        if (err instanceof Error) printError(err.message, "Use 'kanban config add-context' to add one.");
        process.exit(5);
      }
    });
}
