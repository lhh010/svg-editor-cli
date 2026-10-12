import { Shape, InvalidAttributeError } from "./Shape";

export class Ellipse extends Shape {
  constructor(id: string, public cx: number, public cy: number, public rx: number, public ry: number) {
    super(id);
  }

  get tag(): string {
    return "ellipse";
  }

  moveBy(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scaleBy(f: number): void {
    this.cx *= f;
    this.cy *= f;
    this.rx *= f;
    this.ry *= f;
  }

  geometrySummary(): string {
    return (
      "cx=" + Shape.fmt(this.cx) + " cy=" + Shape.fmt(this.cy) + " rx=" + Shape.fmt(this.rx) + " ry=" + Shape.fmt(this.ry)
    );
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
      '<ellipse id="' +
      this.id +
      '" cx="' + Shape.fmt(this.cx) + '" cy="' + Shape.fmt(this.cy) +
      '" rx="' + Shape.fmt(this.rx) + '" ry="' + Shape.fmt(this.ry) + '"' +
      this.commonAttrXml() + "/>"
    );
  }

  setAttribute(attr: string, value: string): string | null {
    const common = this.setCommonAttribute(attr, value);
    if (common !== undefined) return common;
    const n = Shape.requireNumber(attr, value);
    if (attr === "cx") return Shape.swapNumber(this, "cx", n);
    if (attr === "cy") return Shape.swapNumber(this, "cy", n);
    if (attr === "rx") return Shape.swapNumber(this, "rx", n);
    if (attr === "ry") return Shape.swapNumber(this, "ry", n);
    throw new InvalidAttributeError("unknown attribute: " + attr);
  }
}
