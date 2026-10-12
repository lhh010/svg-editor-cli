import { Shape, InvalidAttributeError } from "./Shape";

export class Circle extends Shape {
  constructor(id: string, public cx: number, public cy: number, public r: number) {
    super(id);
  }

  get tag(): string {
    return "circle";
  }

  moveBy(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scaleBy(f: number): void {
    this.cx *= f;
    this.cy *= f;
    this.r *= f;
  }

  geometrySummary(): string {
    return "cx=" + Shape.fmt(this.cx) + " cy=" + Shape.fmt(this.cy) + " r=" + Shape.fmt(this.r);
  }

  detailLines(): string[] {
    const lines = [this.geometrySummary()!];
    if (this.fill !== null) lines.push("fill=" + this.fill);
    if (this.stroke !== null) lines.push("stroke=" + this.stroke);
    if (this.strokeWidth !== null) lines.push("stroke-width=" + this.strokeWidth);
    return lines;
  }

  anchor(): [number, number] {
    return [this.cx, this.cy];
  }

  toXml(indent: string): string {
    return (
      indent +
      '<circle id="' + this.id + '" cx="' + Shape.fmt(this.cx) + '" cy="' + Shape.fmt(this.cy) + '" r="' + Shape.fmt(this.r) + '"' + this.commonAttrXml() + "/>"
    );
  }

  setAttribute(attr: string, value: string): string | null {
    const common = this.setCommonAttribute(attr, value);
    if (common !== undefined) return common;
    const n = Shape.requireNumber(attr, value);
    if (attr === "cx") return Shape.swapNumber(this, "cx", n);
    if (attr === "cy") return Shape.swapNumber(this, "cy", n);
    if (attr === "r") return Shape.swapNumber(this, "r", n);
    throw new InvalidAttributeError("unknown attribute: " + attr);
  }
}
