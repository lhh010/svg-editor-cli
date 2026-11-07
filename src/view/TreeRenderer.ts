import { SvgDocument } from "../document/SvgDocument";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { TreeDecorator } from "../kernel/ExtensionPoints";

interface Row {
  text: string; // 连接符 + 标签
  summary: string | null;
  xml: string;  // 行对应子树的序列化文本（根行为全文档）
  shape: Shape | null;
}

/**
 * tree 命令的树形渲染：连接符 + 标签列对齐 + 内联几何属性 + 行尾插件标签。
 * 渲染器只依赖 TreeDecorator 接口；新增标签时本类与内核均不改动。
 */
export class TreeRenderer {
  constructor(private readonly decorators: readonly TreeDecorator[] = []) {}

  render(doc: SvgDocument, rootId?: string): string[] {
    const rows: Row[] = [];
    if (rootId === undefined) {
      rows.push({ text: "svg (" + doc.width + "x" + doc.height + ")", summary: null, xml: documentXml(doc), shape: null });
      this.collect(doc.root.children, "", rows);
    } else {
      const shape = doc.findById(rootId);
      if (shape === null) return [];
      rows.push({ text: shape.label(), summary: summaryOf(shape), xml: shape.toXml(""), shape });
      if (shape instanceof Group) this.collect(shape.children, "", rows);
    }
    const width = Math.max(...rows.map((r) => r.text.length));
    return rows.map((r) => {
      let line = r.summary === null ? r.text : r.text + pad(width - r.text.length + 2) + r.summary;
      for (const tag of this.tags(r)) line += " " + tag;
      return line;
    });
  }

  private tags(r: Row): string[] {
    const out: string[] = [];
    for (const d of this.decorators) {
      const t = d.decorate({ shape: r.shape, subtreeXml: r.xml });
      if (t !== null) out.push(t);
    }
    return out;
  }

  private collect(shapes: readonly Shape[], indent: string, rows: Row[]): void {
    shapes.forEach((s, i) => {
      const last = i === shapes.length - 1;
      const branch = indent + (last ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ");
      rows.push({ text: branch + s.label(), summary: summaryOf(s), xml: s.toXml(""), shape: s });
      if (s instanceof Group) {
        this.collect(s.children, indent + (last ? "    " : "\u2502   "), rows);
      }
    });
  }
}

function summaryOf(s: Shape | null): string | null {
  return s !== null ? s.treeSummary() : null;
}

function documentXml(doc: SvgDocument): string {
  return doc.root.children.map((s) => s.toXml("")).join("\n");
}

function pad(n: number): string {
  return " ".repeat(Math.max(0, n));
}
