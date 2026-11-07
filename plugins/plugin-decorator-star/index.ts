import { TreeDecorator, TreeRow, PluginContext } from "../../src/kernel/ExtensionPoints";
import { Shape } from "../../src/shapes/Shape";
import { Group } from "../../src/shapes/Group";

/**
 * 树标签插件 modified-star：为"自上次保存以来内容有变化"的行追加 *。
 *
 * ADR-3（dirty 语义）：
 *  - dirty 判定按"内容与上次保存时不一致"（比较该行子树序列化），
 *    因此 undo 回到保存点后 * 自动消失；
 *  - 从未保存（init 后未 save/read）时视为 dirty：所有行（含画布行）都标 *；
 *  - 祖先传播：容器的子树序列化包含子孙，子图形变化天然使祖先行也标 *；
 *  - 多标签拼接顺序由注册顺序决定（内核按注册顺序逐个追加，空格分隔）。
 * 状态（保存点快照）封装在插件实例字段中，不用模块级变量。
 */
class ModifiedStarDecorator implements TreeDecorator {
  /** 保存点快照：id -> 子树序列化；画布根行用 CANVAS_KEY。null 表示从未保存。 */
  private snapshot: Map<string, string> | null = null;

  constructor(private readonly editor: { document(): unknown; events: { on(cb: (e: unknown) => void): void } }) {}

  decorate(row: TreeRow): string | null {
    if (this.snapshot === null) return "*";
    const key = row.shape !== null ? row.shape.id : CANVAS_KEY;
    const saved = this.snapshot.get(key);
    if (saved === undefined) return "*"; // 保存点之后新增的图形
    return row.subtreeXml !== saved ? "*" : null;
  }

  /** 订阅内核事件并在 save/load 时重建快照（activate 时调用）。 */
  start(): void {
    this.editor.events.on((e: unknown) => {
      const ev = e as { type: string };
      if (ev.type === "save" || ev.type === "load") {
        this.snapshot = this.capture();
      } else if (ev.type === "init") {
        this.snapshot = null;
      }
    });
  }

  private capture(): Map<string, string> | null {
    const doc = this.editor.document() as { root: { children: readonly Shape[] } } | null;
    if (doc === null) return null;
    const map = new Map<string, string>();
    map.set(CANVAS_KEY, doc.root.children.map((s) => s.toXml("")).join("\n"));
    const walk = (shapes: readonly Shape[]): void => {
      for (const s of shapes) {
        map.set(s.id, s.toXml(""));
        if (s instanceof Group) walk(s.children);
      }
    };
    walk(doc.root.children);
    return map;
  }
}

const CANVAS_KEY = "__canvas__";

export default {
  name: "@local/plugin-decorator-star",
  contributes: { decorators: ["modified-star"] },
  activate(ctx: PluginContext): void {
    const star = new ModifiedStarDecorator(ctx.editor);
    star.start();
    ctx.registerDecorator("modified-star", star);
  },
};
