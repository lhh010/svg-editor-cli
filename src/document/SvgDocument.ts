import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";

/** 画布根（虚拟 <svg> 节点）：不是 Shape，不可被删除/移动。 */
export class SvgRoot {
  private readonly _children: Shape[] = [];

  get children(): readonly Shape[] {
    return this._children;
  }

  appendChild(child: Shape): void {
    if (child.parent !== null) child.parent.removeChild(child);
    child.parent = null;
    this._children.push(child);
  }

  insertChildAt(child: Shape, index: number): void {
    if (child.parent !== null) child.parent.removeChild(child);
    child.parent = null;
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
}

/** 当前文档：画布尺寸 + 根级图形 + id 注册表（强制唯一、大小写敏感）。 */
export class SvgDocument {
  width = 800;
  height = 600;
  readonly root = new SvgRoot();
  private readonly ids = new Set<string>();

  hasId(id: string): boolean {
    return this.ids.has(id);
  }

  registerId(id: string): void {
    this.ids.add(id);
  }

  releaseId(id: string): void {
    this.ids.delete(id);
  }

  /** 全文档按 id 查找（深度优先）。 */
  findById(id: string): Shape | null {
    return findIn(this.root.children, id);
  }

  /** 元素总数（含容器，不含根）——save 回显用。 */
  elementCount(): number {
    let n = 0;
    const walk = (shapes: readonly Shape[]): void => {
      for (const s of shapes) {
        n++;
        if (s instanceof Group) walk(s.children);
      }
    };
    walk(this.root.children);
    return n;
  }
}

function findIn(shapes: readonly Shape[], id: string): Shape | null {
  for (const s of shapes) {
    if (s.id === id) return s;
    if (s instanceof Group) {
      const hit = findIn(s.children, id);
      if (hit !== null) return hit;
    }
  }
  return null;
}
