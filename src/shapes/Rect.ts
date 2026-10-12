import { Shape, InvalidAttributeError } from "./Shape";

export class Rect extends Shape {
  constructor(id: string, public x: number, public y: number, public width: number, public height: number) {
    super(id);
  }

  get tag(): string {
    return "rect";
  }

  moveBy(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  scaleBy(f: number): void {
    this.x *= f;
    this.y *= f;
    this.width *= f;
    this.height *= f;
  }

  geometrySummary(): string {
    return `x=${Shape.fmt(this.x)} y=${Shape.fmt(this.y)} w=${Shape.fmt(this.width)} h=${Shape.fmt(this.height)}`;
  }

  detailLines(): string[] {
    const lines = [this.geometrySummary()!];
    if (this.fill !== null) lines.push(`fill=${this.fill}`);
    if (this.stroke !== null) lines.push(`stroke=${this.stroke}`);
    if (this.strokeWidth !== null) lines.push(`stroke-width=${this.strokeWidth}`);
    return lines;
  }

  anchor(): [number, number] {
    return [this.x, this.y];
  }

  toXml(indent: string): string {
    return `${indent}<rect id="${this.id}" x="${Shape.fmt(this.x)}" y="${Shape.fmt(this.y)}" width="${Shape.fmt(
      this.width
    )}" height="${Shape.fmt(this.height)}"${this.commonAttrXml()}/>`;
  }

  setAttribute(attr: string, value: string): string | null {
    const common = this.setCommonAttribute(attr, value);
    if (common !== undefined) return common;
    const n = Shape.requireNumber(attr, value);
    switch (attr) {
      case "x":
        return Shape.swapNumber(this, "x", n);
      case "y":
        return Shape.swapNumber(this, "y", n);
      case "width":
        return Shape.swapNumber(this, "width", n);
      case "height":
        return Shape.swapNumber(this, "height", n);
    }
    throw new InvalidAttributeError(`unknown attribute: ${attr}`);
  }
}
