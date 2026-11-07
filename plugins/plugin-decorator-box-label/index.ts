import { TreeDecorator, TreeRow, PluginContext } from "../../src/kernel/ExtensionPoints";

/**
 * 树标签插件 box-type-label：为复合类型容器行追加 "(box)" 类型标注。
 * 只依赖内核公开的 Shape.kindLabel 抽象——不依赖 box 插件包，也不感知其他标签插件；
 * 未装 box 插件时没有任何 kindLabel非空 的图形，本标签自然无输出（缺省行为）。
 */
class BoxTypeLabelDecorator implements TreeDecorator {
  decorate(row: TreeRow): string | null {
    const kind = row.shape !== null ? row.shape.kindLabel : null;
    return kind !== null ? "(" + kind + ")" : null;
  }
}

export default {
  name: "@local/plugin-decorator-box-label",
  contributes: { decorators: ["box-type-label"] },
  activate(ctx: PluginContext): void {
    ctx.registerDecorator("box-type-label", new BoxTypeLabelDecorator());
  },
};
