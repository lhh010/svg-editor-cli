import { SvgDocument } from "../document/SvgDocument";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";

interface Row {
  text: string; // 连接符 + 标签
  summary: string | null;
}

/** tree 命令的树形渲染：连接符 + 标签列对齐 + 内联几何属性。 */
export class TreeRenderer {
  render(doc: SvgDocument, rootId?: string): string[] {
    const rows: Row[] = [];
    let head: string;
    let children: readonly Shape[];
    if (rootId === undefined) {
      head = "svg (" + doc.width + "x" + doc.height + ")";
      children = doc.root.children;
    } else {
      const shape = doc.findById(rootId);
      if (shape === null) return [];
      head = shape.label();
      children = shape instanceof Group ? shape.children : [];
      if (shape instanceof Group && shape.geometrySummary() !== null) {
        // 容器无内联几何，保持 null
      }
    }
    rows.push({ text: head, summary: rootId === undefined ? null : summaryOf(shape0(doc, rootId)) });
    this.collect(children, "", rows);
    const width = Math.max(...rows.map((r) => r.text.length));
    return rows.map((r) => (r.summary === null ? r.text : r.text + pad(width - r.text.length + 2) + r.summary));
  }

  private collect(shapes: readonly Shape[], indent: string, rows: Row[]): void {
    shapes.forEach((s, i) => {
      const last = i === shapes.length - 1;
      const branch = indent + (last ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ");
      rows.push({ text: branch + s.label(), summary: summaryOf(s) });
      if (s instanceof Group) {
        this.collect(s.children, indent + (last ? "    " : "\u2502   "), rows);
      }
    });
  }
}

function summaryOf(s: Shape | null): string | null {
  return s !== null ? s.treeSummary() : null;
}

function shape0(doc: SvgDocument, id: string): Shape | null {
  return doc.findById(id);
}

function pad(n: number): string {
  return " ".repeat(Math.max(0, n));
}
