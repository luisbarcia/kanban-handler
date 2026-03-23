import { createInterface } from "node:readline/promises";

/** Prompt for yes/no confirmation on stderr. Returns true if user answers 'y'. */
export async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(`${message} (y/N) `);
  rl.close();
  return answer.toLowerCase() === "y";
}
