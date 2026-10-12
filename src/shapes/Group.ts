import { Shape, InvalidAttributeError } from "./Shape";

/**
 * 容器图形 <g>（Composite 模式的 Composite）。
 * 子节点顺序即 z-order（文档顺序后者在上层）。
 */
export class Group extends Shape {
  private readonly _children: Shape[] = [];

  constructor(id: string) {
    super(id);
  }

  get tag(): string {
    return "g";
  }

  get isContainer(): boolean {
    return true;
  }

  get children(): readonly Shape[] {
    return this._children;
  }

  appendChild(child: Shape): void {
    this.detachFromCurrentParent(child);
    child.parent = this;
    this._children.push(child);
  }

  insertChildAt(child: Shape, index: number): void {
    this.detachFromCurrentParent(child);
    child.parent = this;
    this._children.splice(index, 0, child);
  }

  removeChild(child: Shape): void {
    const i = this._children.indexOf(child);
    if (i >= 0) {
      this._children.splice(i, 1);
      child.parent = null;
    }
  }

  indexOf(child: Shape): number {
    return this._children.indexOf(child);
  }

  private detachFromCurrentParent(child: Shape): void {
    if (child.parent !== null && child.parent !== this) {
      child.parent.removeChild(child);
    } else if (child.parent === this) {
      const i = this._children.indexOf(child);
      if (i >= 0) this._children.splice(i, 1);
    }
  }

  moveBy(dx: number, dy: number): void {
    for (const c of this._children) c.moveBy(dx, dy);
  }

  scaleBy(factor: number): void {
    for (const c of this._children) c.scaleBy(factor);
  }

  geometrySummary(): string | null {
    return null;
  }

  detailLines(): string[] {
    const lines: string[] = [];
    if (this.fill !== null) lines.push(`fill=${this.fill}`);
    if (this.stroke !== null) lines.push(`stroke=${this.stroke}`);
    if (this.strokeWidth !== null) lines.push(`stroke-width=${this.strokeWidth}`);
    return lines;
  }

  anchor(): [number, number] {
    return this._children.length > 0 ? this._children[0].anchor() : [0, 0];
  }

  toXml(indent: string): string {
    if (this._children.length === 0) return `${indent}<g id="${this.id}"${this.commonAttrXml()}/>`;
    const inner = this._children.map((c) => c.toXml(indent + "  ")).join("\n");
    return `${indent}<g id="${this.id}"${this.commonAttrXml()}>
${inner}
${indent}</g>`;
  }

  setAttribute(attr: string, value: string): string | null {
    const common = this.setCommonAttribute(attr, value);
    if (common !== undefined) return common;
    throw new InvalidAttributeError(`unknown attribute: ${attr}`);
  }

  /** 是否包含给定 id 的子孙（不含自身）。 */
  containsDescendant(id: string): boolean {
    for (const c of this._children) {
      if (c.id === id || (c instanceof Group && c.containsDescendant(id))) return true;
    }
    return false;
  }

  /** 自身是否为 shape 的祖先。 */
  isAncestorOf(shape: Shape): boolean {
    let p = shape.parent;
    while (p !== null) {
      if (p === this) return true;
      p = p.parent;
    }
    return false;
  }

  /** 以自身为根的子树内的图形（含自身）。 */
  subtreeShapes(): Shape[] {
    const out: Shape[] = [this as Shape];
    for (const c of this._children) {
      if (c instanceof Group) out.push(...c.subtreeShapes());
      else out.push(c);
    }
    return out;
  }
}
