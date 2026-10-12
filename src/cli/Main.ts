import { Editor } from "../core/Editor";
import { CommandDispatcher } from "./CommandDispatcher";
import { Repl } from "./Repl";

async function main(): Promise<void> {
  console.log("svg-editor 0.1 \u2014 type 'help' for commands");
  console.log();
  const editor = new Editor();
  const dispatcher = new CommandDispatcher(editor);
  await new Repl(dispatcher).run();
}

void main();
