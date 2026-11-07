import * as fs from "node:fs";
import * as path from "node:path";
import { CommandSpec, CommandContext } from "../../src/kernel/ExtensionPoints";
import { CliError } from "../../src/errors/CliError";

/**
 * 命令插件 dir：列出 CLI 进程当前工作目录的直接子项。
 * 通过 DirectoryAccess 接口访问文件系统（适配器模式）：
 *   - Target（DirCommand）只依赖 DirectoryAccess 接口
 *   - Adaptee 是 Node 的 fs/readdirSync
 *   - FsDirectoryAdapter 把 fs 适配成接口；测试用 InMemoryDirectoryAccess 替身
 * 符号链接不遍历目标，按 [FILE] 显示（lstat 语义，见 ADR）。
 */
export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
}

export interface DirectoryAccess {
  /** 读取目录直接子项；失败抛 Error（由命令转为 error: cannot read directory）。 */
  readEntries(dirPath: string): DirectoryEntry[];
}

/** 适配器：Node fs -> DirectoryAccess。 */
export class FsDirectoryAdapter implements DirectoryAccess {
  readEntries(dirPath: string): DirectoryEntry[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  }
}

/** 测试替身：内存目录。 */
export class InMemoryDirectoryAccess implements DirectoryAccess {
  constructor(private readonly entries: DirectoryEntry[] | Error) {}
  readEntries(_dirPath: string): DirectoryEntry[] {
    if (this.entries instanceof Error) throw this.entries;
    return this.entries;
  }
}

class DirCommand implements CommandSpec {
  readonly name = "dir";
  readonly usage = "dir";
  readonly summary = "list entries of the current working directory";

  constructor(private readonly access: DirectoryAccess = new FsDirectoryAdapter()) {}

  execute(args: string[], _ctx: CommandContext): string[] {
    if (args.length > 0) throw new CliError("usage: dir");
    const cwd = process.cwd();
    let entries: DirectoryEntry[];
    try {
      entries = this.access.readEntries(cwd);
    } catch {
      throw new CliError("cannot read directory: " + cwd);
    }
    if (entries.length === 0) return ["(empty directory)"];
    const dirs = entries.filter((e) => e.isDirectory).map((e) => e.name).sort(byName);
    const files = entries.filter((e) => !e.isDirectory).map((e) => e.name).sort(byName);
    const out: string[] = [];
    for (const d of dirs) out.push("[DIR]  " + d);
    for (const f of files) out.push("[FILE]  " + f);
    return out;
  }
}

function byName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export { DirCommand };

export default {
  name: "@local/plugin-cmd-dir",
  contributes: { commands: ["dir"] },
  activate(ctx: import("../../src/kernel/ExtensionPoints").PluginContext): void {
    ctx.registerCommand(new DirCommand());
  },
};
void path;
