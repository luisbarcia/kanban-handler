import { createProgram } from "./cli.js";
import { CommanderError } from "commander";

const program = createProgram();
program.parseAsync(process.argv).catch((err) => {
  if (err instanceof CommanderError) {
    process.exit(err.exitCode);
  }
  process.exit(1);
});
