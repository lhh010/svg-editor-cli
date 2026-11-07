import { CommandSpec, CommandContext } from "../../src/kernel/ExtensionPoints";
import { Shape } from "../../src/shapes/Shape";
import { Group } from "../../src/shapes/Group";
import { CliError } from "../../src/errors/CliError";

/**
 * 命令插件 stats：按当前子节点顺序深度优先统计图形类型。
 * 独立于内置命令表所在的包，经 Command 扩展点接入内核。
 */
class StatsCommand implements CommandSpec {
  readonly name = "stats";
  readonly usage = "stats";
  readonly summary = "count shapes by type (DFS order), total leaves and containers";

  execute(args: string[], ctx: CommandContext): string[] {
    if (args.length > 0) throw new CliError("usage: stats");
    const doc = ctx.editor.requireDocument();
    const counts = new Map<string, number>();
    let total = 0;
    let containers = 0;
    const walk = (shapes: readonly Shape[]): void => {
      for (const s of shapes) {
        if (s instanceof Group) {
          containers++; // 普通 g 与 box 等复合类型只计入 containers
          walk(s.children);
        } else {
          total++;
          counts.set(s.tag, (counts.get(s.tag) ?? 0) + 1);
        }
      }
    };
    walk(doc.root.children);
    const entries = [...counts.entries()].map(([t, n]) => t + ": " + n).join("  ");
    const line = (entries.length > 0 ? entries + "  " : "") + "(total " + total + ", containers " + containers + ")";
    return [line];
  }
}

export default {
  name: "@local/plugin-cmd-stats",
  contributes: { commands: ["stats"] },
  activate(ctx: import("../../src/kernel/ExtensionPoints").PluginContext): void {
    ctx.registerCommand(new StatsCommand());
  },
};
