import { Editor } from "../core/Editor";
import { CliError } from "../errors/CliError";
import { Tokenizer, Token } from "./Tokenizer";
import { CreateCommand } from "../commands/CreateCommand";
import { DeleteCommand } from "../commands/DeleteCommand";
import { MoveCommand } from "../commands/MoveCommand";
import { ScaleCommand } from "../commands/ScaleCommand";
import { SetCommand } from "../commands/SetCommand";
import { GroupCommand } from "../commands/GroupCommand";
import { UngroupCommand } from "../commands/UngroupCommand";
import { AddtoCommand } from "../commands/AddtoCommand";
import { ZOrderCommand } from "../commands/ZOrderCommand";
import { TreeRenderer } from "../view/TreeRenderer";
import { ShowRenderer } from "../view/ShowRenderer";
import { Help } from "./Help";
import { mustFind } from "../commands/Resolve";
import { InvalidAttributeError } from "../shapes/Shape";

/**
 * 命令分发（规范允许的两处名字分派之一）。
 * 每条命令返回要打印的行；失败抛 CliError/InvalidAttributeError，由 REPL 统一加 error: 前缀。
 */
export class CommandDispatcher {
  constructor(private readonly editor: Editor) {}

  async handle(line: string): Promise<string[]> {
    let tokens: Token[];
    try {
      tokens = Tokenizer.tokenize(line);
    } catch (e) {
      throw new CliError(e instanceof Error ? e.message : "bad line");
    }
    if (tokens.length === 0) return [];
    const name = tokens[0].value;
    const args = tokens.slice(1);
    switch (name) {
      case "help":
        return Help.lines;
      case "init":
        return this.cmdInit(args);
      case "read":
        return this.cmdRead(args);
      case "save":
        return this.cmdSave(args);
      case "canvas":
        return this.cmdCanvas(args);
      case "create":
        return this.cmdCreate(args);
      case "delete":
        return [this.editor.executeEdit(new DeleteCommand(this.editor.requireDocument(), reqId(args[0], "delete")))];
      case "move": {
        const [id, dx, dy] = [reqId(args[0], "move"), num(args[1], "dx"), num(args[2], "dy")];
        return [this.editor.executeEdit(new MoveCommand(this.editor.requireDocument(), id, dx, dy))];
      }
      case "scale": {
        const id = reqId(args[0], "scale");
        return [this.editor.executeEdit(new ScaleCommand(this.editor.requireDocument(), id, num(args[1], "factor")))];
      }
      case "set": {
        const id = reqId(args[0], "set");
        const attr = reqId(args[1], "set");
        const value = args.slice(2).map((t) => t.value).join(" ");
        if (args.length < 3) throw new CliError("usage: set <id> <attr> <value>");
        return [this.editor.executeEdit(new SetCommand(this.editor.requireDocument(), id, attr, value))];
      }
      case "group": {
        if (args.length < 2) throw new CliError("usage: group <newGid> <id> [<id>...]");
        const gid = args[0].value;
        const ids = args.slice(1).map((t) => t.value);
        return [this.editor.executeEdit(new GroupCommand(this.editor.requireDocument(), gid, ids))];
      }
      case "ungroup":
        return [this.editor.executeEdit(new UngroupCommand(this.editor.requireDocument(), reqId(args[0], "ungroup")))];
      case "addto": {
        if (args.length !== 2) throw new CliError("usage: addto <gid> <id>");
        return [this.editor.executeEdit(new AddtoCommand(this.editor.requireDocument(), args[0].value, args[1].value))];
      }
      case "front":
        return [this.editor.executeEdit(new ZOrderCommand(this.editor.requireDocument(), reqId(args[0], "front"), true))];
      case "back":
        return [this.editor.executeEdit(new ZOrderCommand(this.editor.requireDocument(), reqId(args[0], "back"), false))];
      case "tree": {
        const doc = this.editor.requireDocument();
        const id = args.length > 0 ? args[0].value : undefined;
        if (id !== undefined) mustFind(doc, id);
        return new TreeRenderer().render(doc, id);
      }
      case "show": {
        const shape = mustFind(this.editor.requireDocument(), reqId(args[0], "show"));
        return new ShowRenderer().render(shape);
      }
      case "undo":
        return [this.editor.undo()];
      case "redo":
        return [this.editor.redo()];
      case "exit":
      case "quit":
        return ["bye"];
      default:
        throw new CliError("unknown command: " + name);
    }
  }

  private cmdInit(args: Token[]): string[] {
    const w = args.length > 0 ? num(args[0], "width") : 800;
    const h = args.length > 1 ? num(args[1], "height") : 600;
    this.editor.newDocument(w, h);
    return ["canvas " + w + "x" + h + " created"];
  }

  private cmdRead(args: Token[]): string[] {
    if (args.length !== 1) throw new CliError("usage: read <file.svg>");
    const path = args[0].value;
    const r = this.editor.loadFile(path);
    return [...r.warnings, "read " + path + " (" + r.count + " elements)"];
  }

  private cmdSave(args: Token[]): string[] {
    if (args.length > 1) throw new CliError("usage: save [file.svg]");
    const path = this.editor.saveFile(args.length === 1 ? args[0].value : null);
    return ["saved to " + path + " (" + this.editor.elementCount() + " elements)"];
  }

  private cmdCanvas(args: Token[]): string[] {
    const doc = this.editor.requireDocument();
    if (args.length === 0) return ["canvas " + doc.width + "x" + doc.height];
    if (args.length !== 2) throw new CliError("usage: canvas [w] [h]");
    const w = num(args[0], "width");
    const h = num(args[1], "height");
    doc.width = w;
    doc.height = h;
    this.editor.history.lockIo();
    return ["canvas " + w + "x" + h];
  }

  private cmdCreate(args: Token[]): string[] {
    if (args.length < 2) throw new CliError("usage: create <type> <id> [params...] [in <containerId>]");
    const type = args[0].value;
    const id = args[1].value;
    let rest = args.slice(2);
    let containerId: string | null = null;
    if (rest.length >= 2 && rest[rest.length - 2].value === "in" && !rest[rest.length - 2].quoted) {
      containerId = rest[rest.length - 1].value;
      rest = rest.slice(0, -2);
    }
    const cmd = new CreateCommand(this.editor.requireDocument(), this.editor.factory, type, id, rest.map((t) => t.value), containerId);
    return [this.editor.executeEdit(cmd)];
  }
}

function reqId(t: Token | undefined, cmd: string): string {
  if (t === undefined) throw new CliError("usage: " + cmd + " <id>");
  return t.value;
}

function num(t: Token | undefined, name: string): number {
  if (t === undefined) throw new CliError("missing parameter: " + name);
  const n = Number(t.value);
  if (!Number.isFinite(n)) throw new CliError("invalid number: " + t.value);
  return n;
}

export { InvalidAttributeError };
