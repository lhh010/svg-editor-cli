import * as readline from "node:readline/promises";
import { CommandDispatcher } from "./CommandDispatcher";
import { CliError } from "../errors/CliError";
import { InvalidAttributeError } from "../shapes/Shape";

/** REPL 主循环：'svg> ' 提示，'#' 注释，错误统一 error: 前缀且不改变状态。 */
export class Repl {
  constructor(private readonly dispatcher: CommandDispatcher) {}

  async run(): Promise<void> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "svg> " });
    rl.prompt();
    rl.on("line", (line: string) => {
      void (async () => {
        const trimmed = line.trim();
        if (trimmed.length > 0 && !trimmed.startsWith("#")) {
          try {
            const out = await this.dispatcher.handle(trimmed);
            for (const l of out) console.log(l);
            if (trimmed === "exit" || trimmed === "quit") {
              rl.close();
              return;
            }
          } catch (e) {
            if (e instanceof CliError || e instanceof InvalidAttributeError) {
              console.log("error: " + e.message);
            } else {
              console.log("error: " + (e instanceof Error ? e.message : String(e)));
            }
          }
        }
        rl.prompt();
      })();
    });
    await new Promise<void>((resolve) => rl.on("close", () => resolve()));
  }
}
