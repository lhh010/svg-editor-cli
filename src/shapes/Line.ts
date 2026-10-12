import { Shape, InvalidAttributeError } from "./Shape";

export class Line extends Shape {
  constructor(id: string, public x1: number, public y1: number, public x2: number, public y2: number) {
    super(id);
  }

  get tag(): string {
    return "line";
  }

  moveBy(dx: number, dy: number): void {
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
  }

  scaleBy(f: number): void {
    this.x1 *= f;
    this.y1 *= f;
    this.x2 *= f;
    this.y2 *= f;
  }

  geometrySummary(): string {
    return (
      "(" + Shape.fmt(this.x1) + "," + Shape.fmt(this.y1) + ") -> (" + Shape.fmt(this.x2) + "," + Shape.fmt(this.y2) + ")"
    );
  }

  detailLines(): string[] {
    const lines = [
      "x1=" + Shape.fmt(this.x1) + " y1=" + Shape.fmt(this.y1) + " x2=" + Shape.fmt(this.x2) + " y2=" + Shape.fmt(this.y2),
    ];
    if (this.stroke !== null) lines.push("stroke=" + this.stroke);
    if (this.strokeWidth !== null) lines.push("stroke-width=" + this.strokeWidth);
    return lines;
  }

  anchor(): [number, number] {
    return [this.x1, this.y1];
  }

  toXml(indent: string): string {
    return (
      indent +
      '<line id="' + this.id +
      '" x1="' + Shape.fmt(this.x1) + '" y1="' + Shape.fmt(this.y1) +
      '" x2="' + Shape.fmt(this.x2) + '" y2="' + Shape.fmt(this.y2) + '"' +
      this.commonAttrXml() + "/>"
    );
  }

  setAttribute(attr: string, value: string): string | null {
    const common = this.setCommonAttribute(attr, value);
    if (common !== undefined) return common;
    const n = Shape.requireNumber(attr, value);
    if (attr === "x1") return Shape.swapNumber(this, "x1", n);
    if (attr === "y1") return Shape.swapNumber(this, "y1", n);
    if (attr === "x2") return Shape.swapNumber(this, "x2", n);
    if (attr === "y2") return Shape.swapNumber(this, "y2", n);
    throw new InvalidAttributeError("unknown attribute: " + attr);
  }
}
