import * as fs from "node:fs";
import { SvgDocument } from "../document/SvgDocument";
import { ShapeFactory } from "../shapes/ShapeFactory";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { Command } from "../commands/Command";
import { CommandHistory } from "../commands/CommandHistory";
import { SvgReader } from "../io/SvgReader";
import { SvgWriter } from "../io/SvgWriter";
import { CliError } from "../errors/CliError";

/**
 * 编辑器门面：持有当前文档、工厂与命令历史。
 * 文档类命令（init/read/save/canvas 改尺寸）在此处理并锁 io；
 * 编辑类命令构造为 Command 交由历史管理。
 */
export class Editor {
  private doc: SvgDocument | null = null;
  readonly factory = new ShapeFactory();
  readonly history = new CommandHistory();
  filePath: string | null = null;

  requireDocument(): SvgDocument {
    if (this.doc === null) throw new CliError("no document. use 'init' or 'read' first");
    return this.doc;
  }

  document(): SvgDocument | null {
    return this.doc;
  }

  newDocument(w: number, h: number): void {
    this.doc = new SvgDocument();
    this.doc.width = w;
    this.doc.height = h;
    this.filePath = null;
    this.history.reset();
    this.history.lockIo();
  }

  loadSource(source: string, path: string): { warnings: string[]; count: number } {
    let result;
    try {
      result = new SvgReader().read(source);
    } catch (e) {
      throw new CliError("cannot read file: " + path);
    }
    const doc = new SvgDocument();
    doc.width = result.width;
    doc.height = result.height;
    for (const s of result.shapes) doc.root.appendChild(s);
    for (const s of result.shapes) for (const id of subtreeIds(s)) doc.registerId(id);
    this.doc = doc;
    this.filePath = path;
    this.history.reset();
    this.history.lockIo();
    return { warnings: result.warnings, count: doc.elementCount() };
  }

  loadFile(path: string): { warnings: string[]; count: number } {
    let source: string;
    try {
      source = fs.readFileSync(path, "utf-8");
    } catch {
      throw new CliError("cannot read file: " + path);
    }
    return this.loadSource(source, path);
  }

  saveFile(path: string | null): string {
    const doc = this.requireDocument();
    const target = path ?? this.filePath;
    if (target === null) throw new CliError("no target file: use 'save <file.svg>' or read a file first");
    try {
      fs.writeFileSync(target, new SvgWriter().serialize(doc), "utf-8");
    } catch {
      throw new CliError("cannot write file: " + target);
    }
    this.filePath = target;
    this.history.lockIo();
    return target;
  }

  elementCount(): number {
    return this.requireDocument().elementCount();
  }

  executeEdit(cmd: Command): string {
    const message = cmd.execute();
    this.history.push(cmd);
    return message;
  }

  undo(): string {
    return this.history.undo().undo();
  }

  redo(): string {
    return this.history.redo().execute();
  }
}

function subtreeIds(s: Shape): string[] {
  return s instanceof Group ? s.subtreeShapes().map((x) => x.id) : [s.id];
}
