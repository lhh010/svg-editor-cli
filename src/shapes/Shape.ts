import { Group } from "./Group";

/** set 白名单外/非法取值的领域错误。 */
export class InvalidAttributeError extends Error {}

/**
 * 图形元素抽象基类（Composite 模式的 Component）。
 * 叶子（rect/circle/...）与容器（g）实现统一接口：moveBy / scaleBy / toXml。
 * 公共外观属性 fill / stroke / stroke-width 在此统一管理。
 */
export abstract class Shape {
  readonly id: string;
  fill: string | null = null;
  stroke: string | null = null;
  strokeWidth: string | null = null;
  parent: Group | null = null; // null 表示直接挂在画布根

  protected constructor(id: string) {
    if (!id) throw new Error("shape id must not be empty");
    this.id = id;
  }

  abstract get tag(): string;

  /** 复合类型标注（如插件阶段的 box），普通图形返回 null。 */
  get kindLabel(): string | null {
    return null;
  }

  get isContainer(): boolean {
    return false;
  }

  /** 平移：叶子修改自身几何；容器递归到子孙。 */
  abstract moveBy(dx: number, dy: number): void;

  /** 等比缩放：叶子将全部几何属性同乘 factor；容器递归到子孙。 */
  abstract scaleBy(factor: number): void;

  /** tree 内联的几何摘要（如 "x=0 y=0 w=800 h=600"），容器返回 null。 */
  abstract geometrySummary(): string | null;

  /** tree 内联摘要；默认即几何摘要，可复写以附带外观属性。 */
  treeSummary(): string | null {
    return this.geometrySummary();
  }

  /** show 的属性行（不含 parent 行，由视图层拼装）。 */
  abstract detailLines(): string[];

  /** 命令回显用的参考点（如 rect 的 (x,y)、circle 的 (cx,cy)）。 */
  abstract anchor(): [number, number];

  /** 序列化为 SVG 片段（含缩进）。 */
  abstract toXml(indent: string): string;

  /** set 白名单外的属性抛 InvalidAttributeError；返回旧值（null 表示原未设置）。 */
  abstract setAttribute(attr: string, value: string): string | null;

  /** 命令回显标签："rect#r1"、"g#n1 (box)"。 */
  label(): string {
    return this.kindLabel ? this.tag + "#" + this.id + " (" + this.kindLabel + ")" : this.tag + "#" + this.id;
  }

  /** 公共属性序列化片段（不含 id）。 */
  protected commonAttrXml(): string {
    let s = "";
    if (this.fill !== null) s += ' fill="' + this.fill + '"';
    if (this.stroke !== null) s += ' stroke="' + this.stroke + '"';
    if (this.strokeWidth !== null) s += ' stroke-width="' + this.strokeWidth + '"';
    return s;
  }

  /** 撤销 set 时把属性还原为"未设置"（仅公共外观属性需要）。 */
  clearAttribute(attr: string): void {
    if (attr === "fill") this.fill = null;
    else if (attr === "stroke") this.stroke = null;
    else if (attr === "stroke-width") this.strokeWidth = null;
  }

  /** set 公共属性（fill/stroke/stroke-width）；不属于公共属性返回 undefined 交子类判断。 */
  protected setCommonAttribute(attr: string, value: string): string | null | undefined {
    if (attr === "fill") {
      const old = this.fill;
      this.fill = value;
      return old;
    }
    if (attr === "stroke") {
      const old = this.stroke;
      this.stroke = value;
      return old;
    }
    if (attr === "stroke-width") {
      const old = this.strokeWidth;
      this.strokeWidth = value;
      return old;
    }
    return undefined;
  }

  /** 数值校验 helper。 */
  protected static requireNumber(attr: string, value: string): number {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new InvalidAttributeError("invalid value for " + attr + ": " + value);
    return n;
  }

  /** 数值序列化：去掉多余小数位（100 -> "100"，1.5 -> "1.5"）。 */
  static fmt(n: number): string {
    return String(Math.round(n * 1e6) / 1e6);
  }

  /** 把对象数值字段替换为新值，返回旧值字符串（供 undo 记录）。 */
  protected static swapNumber(obj: object, key: string, n: number): string {
    const rec = obj as Record<string, unknown>;
    const old = Shape.fmt(rec[key] as number);
    rec[key] = n;
    return old;
  }

  /** XML 文本转义（内容与属性值共用）。 */
  static escapeXml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
