import chalk from "chalk";
import ora, { type Ora } from "ora";

let forceNoColor = false;
export function setNoColor(value: boolean): void { forceNoColor = value; }
const isTTY = (): boolean => !forceNoColor && (process.stdout.isTTY ?? false);

export const color = {
  success: (text: string) => (isTTY() ? chalk.green(text) : text),
  error: (text: string) => (isTTY() ? chalk.red(text) : text),
  warn: (text: string) => (isTTY() ? chalk.yellow(text) : text),
  dim: (text: string) => (isTTY() ? chalk.dim(text) : text),
  bold: (text: string) => (isTTY() ? chalk.bold(text) : text),
};

export function spinner(text: string): Ora {
  return ora({ text, isSilent: !isTTY() });
}

export function printError(message: string, suggestion?: string): void {
  console.error(color.error(`Error: ${message}`));
  if (suggestion) {
    console.error(color.dim(`Hint: ${suggestion}`));
  }
}
