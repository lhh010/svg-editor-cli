import { ShapeProvider, ShapeParseContext, AttributeHandler, EditRecorder, AttributeApplyResult, PluginContext } from "../../src/kernel/ExtensionPoints";
import { Group } from "../../src/shapes/Group";
import { Rect } from "../../src/shapes/Rect";
import { Text } from "../../src/shapes/Text";
import { Shape } from "../../src/shapes/Shape";
import { SvgElementNode } from "../../src/io/XmlParser";
import { CliError } from "../../src/errors/CliError";

/**
 * 图形插件 box：带标题的矩形框（rect + text 组成的复合容器）。
 * 仅依赖内核公开抽象（Group/Rect/Text/Shape 与扩展点接口），不依赖内核实现与装配模块。
 * 语义见 phase_cli_1.md §4.4：
 *   create box <id> <x> <y> <w> <h> "<标题>" [in <cid>]
 *   set <id> fill <c>  -> 传播到内部 rect；set <id> label "s" -> 改写内部 text
 *   序列化 <g data-kind="box">；ungroup 拒绝；必要子部件不可删除/移走
 */

/** box 容器：kindLabel 驱动 echoLabel("box#id")、isComposite 与 data-kind 序列化。 */
export class BoxGroup extends Group {
  private rectPart: Rect | null = null;
  private labelPart: Text | null = null;

  constructor(id: string) {
    super(id);
  }

  get kindLabel(): string {
    return "box";
  }

  protected extraAttrXml(): string {
    return ' data-kind="box"';
  }

  creationEcho(): string {
    return "box#" + this.id + " created (g#" + this.id + " + rect#" + this.id + "-rect + text#" + this.id + "-label)";
  }

  /** 必要子部件（模板的 rect 与 text）不可被 delete/addto/group 摘除；其余子节点自由。 */
  canDetach(child: Shape): boolean {
    return child !== this.rectPart && child !== this.labelPart;
  }

  rectChild(): Rect {
    this.ensureParts();
    return this.rectPart!;
  }

  labelChild(): Text {
    this.ensureParts();
    return this.labelPart!;
  }

  /** 装配模板：rect(<id>-rect) + text(<id>-label)，label 位于 (x+20, y+35)。 */
  assemble(x: number, y: number, w: number, h: number, title: string): void {
    const rect = new Rect(this.id + "-rect", x, y, w, h);
    rect.fill = "#4a90d9";
    const label = new Text(this.id + "-label", x + 20, y + 35, title);
    this.appendChild(rect);
    this.appendChild(label);
    this.rectPart = rect;
    this.labelPart = label;
  }

  adoptParts(rect: Rect, label: Text): void {
    this.appendChild(rect);
    this.appendChild(label);
    this.rectPart = rect;
    this.labelPart = label;
  }

  private ensureParts(): void {
    if (this.rectPart === null || this.labelPart === null) {
      throw new CliError("box is missing its template parts: " + this.id);
    }
  }
}

export class BoxShapeProvider implements ShapeProvider {
  readonly typeName = "box";
  readonly tagName = "g"; // box 序列化为 <g data-kind="box">

  create(id: string, params: string[]): Shape {
    if (params.length < 5) throw new CliError('box requires <x> <y> <w> <h> "<标题>"');
    const nums = params.slice(0, 4).map((v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new CliError("invalid number: " + v);
      return n;
    });
    const box = new BoxGroup(id);
    box.assemble(nums[0], nums[1], nums[2], nums[3], params[4]);
    return box;
  }

  /**
   * 读回：<g data-kind="box"> 且恰好包含一个 rect 与一个 text 子部件；
   * 缺失/类型错误则明确拒绝整个读入（ADR-2：不生成不完整的 box 对象）。
   * 未安装本插件时，内核的 GProvider 负责降级为普通 g 并警告。
   */
  parse(node: SvgElementNode, ctx: ShapeParseContext): Shape | null {
    if (node.attrs.get("data-kind") !== "box") return null;
    const box = new BoxGroup(node.attrs.get("id") ?? "");
    let rect: Rect | null = null;
    let label: Text | null = null;
    for (const c of node.children) {
      if (c.tag === "#text") continue;
      const child = ctx.parseChild(c);
      if (child === null) continue;
      if (child instanceof Rect && rect === null) rect = child;
      else if (child instanceof Text && label === null) label = child;
      else throw new CliError("malformed box: unexpected child <" + child.tag + "> in " + box.id);
    }
    if (rect === null || label === null) {
      throw new CliError("malformed box: requires exactly one rect and one text child: " + box.id);
    }
    box.adoptParts(rect, label);
    return box;
  }
}

/**
 * 属性处理器：box 的领域语义。
 * fill -> 内部 rect 的 fill；label -> 内部 text 的 text 内容。
 * 所有修改经 recorder 登记（内核据此保证一次 set = 一个 undo 单元并在失败时回滚）。
 */
export class BoxAttributeHandler implements AttributeHandler {
  handles(shape: Shape, attr: string): boolean {
    return shape instanceof BoxGroup && (attr === "fill" || attr === "label");
  }

  apply(shape: Shape, attr: string, value: string, recorder: EditRecorder): AttributeApplyResult {
    const box = shape as BoxGroup;
    if (attr === "fill") {
      const rect = box.rectChild();
      recorder.record(rect, "fill", rect.fill);
      rect.setAttribute("fill", value);
      return {
        message: box.echoLabel() + " fill propagated to " + rect.id,
        undoMessage: box.echoLabel() + " fill restored on " + rect.id,
      };
    }
    const label = box.labelChild();
    const previous = label.content;
    recorder.record(label, "text", previous);
    label.setAttribute("text", value);
    return {
      message: box.echoLabel() + ' label updated: "' + value + '"',
      undoMessage: box.echoLabel() + ' label restored: "' + previous + '"',
    };
  }
}

export default {
  name: "@local/plugin-shape-box",
  contributes: { shapes: ["box"], attributes: ["box-attributes"] },
  activate(ctx: PluginContext): void {
    ctx.registerShape("box", new BoxShapeProvider());
    ctx.registerAttributeHandler("box-attributes", new BoxAttributeHandler());
  },
};
