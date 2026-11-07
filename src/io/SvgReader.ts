import { XmlNode, XmlParser } from "./XmlParser";
import { Shape } from "../shapes/Shape";
import { KernelRegistries } from "../kernel/Registries";
import { ShapeParseContext } from "../kernel/ExtensionPoints";
import { CliError } from "../errors/CliError";

export interface ReadResult {
  width: number;
  height: number;
  shapes: Shape[];
  warnings: string[];
}

/**
 * 读入 SVG：缺 id 的元素按 "标签名+序号" 自动补并输出警告。
 * 元素认领完全经 ShapeProvider 注册表分发——内核不按标签名 switch。
 */
export class SvgReader implements ShapeParseContext {
  private readonly used = new Set<string>();

  constructor(private readonly registries: KernelRegistries) {}

  read(source: string): ReadResult {
    const root = XmlParser.parse(source);
    const warnings: string[] = [];
    const counter = new Map<string, number>();
    this.warnings = warnings;
    this.counter = counter;
    const width = num(root.attrs, "width", viewBoxSize(root.attrs, 0, 800));
    const height = num(root.attrs, "height", viewBoxSize(root.attrs, 1, 600));
    const shapes: Shape[] = [];
    for (const c of root.children) {
      if (c.tag === "#text") continue;
      const shape = this.parseChild(c);
      if (shape !== null) shapes.push(shape);
    }
    return { width, height, shapes, warnings };
  }

  // ---- ShapeParseContext 实现 ----

  parseChild(node: SvgElementNodeLike): Shape | null {
    if (node.tag === "#text") return null;
    const providers = this.registries.shapes.providersFor(node.tag);
    if (providers.length === 0) {
      this.warn("warning: skipped unsupported element <" + node.tag + ">");
      return null;
    }
    let id = node.attrs.get("id") ?? "";
    if (id === "") {
      let n = (this.counter.get(node.tag) ?? 0) + 1;
      while (this.used.has(node.tag + n)) n++;
      this.counter.set(node.tag, n);
      id = node.tag + n;
      this.warn("warning: assigned id " + id + " to unnamed <" + node.tag + ">");
    }
    if (this.used.has(id)) throw new CliError("duplicate id in file: " + id);
    this.used.add(id);
    node.attrs.set("id", id); // 自动补的 id 注入节点，供 provider 构造图形
    let shape: Shape | null = null;
    for (const p of providers) {
      shape = p.parse(node, this);
      if (shape !== null) break;
    }
    if (shape === null) {
      this.warn("warning: skipped unsupported element <" + node.tag + ">");
      return null;
    }
    // 子节点在各自 parseChild 中已注册；容器无需重复登记子树
    const fill = node.attrs.get("fill");
    const stroke = node.attrs.get("stroke");
    const sw = node.attrs.get("stroke-width");
    if (fill !== undefined && shape.fill === null) shape.fill = fill;
    if (stroke !== undefined && shape.stroke === null) shape.stroke = stroke;
    if (sw !== undefined && shape.strokeWidth === null) shape.strokeWidth = sw;
    return shape;
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  private warnings: string[] = [];
  private counter = new Map<string, number>();
}

type SvgElementNodeLike = XmlNode;

function num(a: Map<string, string>, key: string, dflt: number): number {
  const v = a.get(key);
  if (v === undefined) return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

function viewBoxSize(a: Map<string, string>, part: 0 | 1, dflt: number): number {
  const vb = a.get("viewBox");
  if (vb === undefined) return dflt;
  const parts = vb.trim().split(/[\s,]+/).map(Number);
  return Number.isFinite(parts[part + 2]) ? parts[part + 2] : dflt;
}
