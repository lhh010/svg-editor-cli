import { Command } from "./Command";
import { CliError } from "../errors/CliError";

/** undo/redo 双栈；文档类命令后加锁（io 锁），下一次编辑命令重新解禁。 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private locked = false;

  push(cmd: Command): void {
    this.redoStack = [];
    this.locked = false;
    this.undoStack.push(cmd);
  }

  undo(): Command {
    this.assertUnlocked("undo");
    const cmd = this.undoStack.pop();
    if (cmd === undefined) throw new CliError("nothing to undo");
    this.redoStack.push(cmd);
    return cmd;
  }

  redo(): Command {
    this.assertUnlocked("redo");
    const cmd = this.redoStack.pop();
    if (cmd === undefined) throw new CliError("nothing to redo");
    this.undoStack.push(cmd);
    return cmd;
  }

  private assertUnlocked(verb: string): void {
    if (this.locked) throw new CliError(verb + " not allowed after io command");
  }

  /** 文档类命令（init/read/save/canvas 改尺寸）后调用。 */
  lockIo(): void {
    this.locked = true;
  }

  /** init/read 换文档时调用：历史与锁全部重置为"已锁、空栈"。 */
  reset(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.locked = true;
  }
}
