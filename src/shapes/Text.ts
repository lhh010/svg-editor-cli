import { Shape, InvalidAttributeError } from "./Shape";

/** <text> 元素：内容是子文本而非属性，单独以 content 字段保存。 */
export class Text extends Shape {
  content: string;

  constructor(id: string, public x: number, public y: number, content: string) {
    super(id);
    this.content = content;
  }

  get tag(): string {
    return "text";
  }

  moveBy(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  scaleBy(f: number): void {
    this.x *= f;
    this.y *= f;
  }

  geometrySummary(): string {
    return "(" + Shape.fmt(this.x) + "," + Shape.fmt(this.y) + ') "' + this.content + '"';
  }

  detailLines(): string[] {
    const lines = ["x=" + Shape.fmt(this.x) + " y=" + Shape.fmt(this.y)];
    if (this.fill !== null) lines.push("fill=" + this.fill);
    if (this.stroke !== null) lines.push("stroke=" + this.stroke);
    if (this.strokeWidth !== null) lines.push("stroke-width=" + this.strokeWidth);
    lines.push('text="' + this.content + '"');
    return lines;
  }

  anchor(): [number, number] {
    return [this.x, this.y];
  }

  toXml(indent: string): string {
    return (
      indent +
      '<text id="' + this.id + '" x="' + Shape.fmt(this.x) + '" y="' + Shape.fmt(this.y) + '"' +
      this.commonAttrXml() + ">" + Shape.escapeXml(this.content) + "</text>"
    );
  }

  setAttribute(attr: string, value: string): string | null {
    if (attr === "text") {
      const old = this.content;
      this.content = value;
      return old;
    }
    const common = this.setCommonAttribute(attr, value);
    if (common !== undefined) return common;
    const n = Shape.requireNumber(attr, value);
    if (attr === "x") return Shape.swapNumber(this, "x", n);
    if (attr === "y") return Shape.swapNumber(this, "y", n);
    throw new InvalidAttributeError("unknown attribute: " + attr);
  }
}
