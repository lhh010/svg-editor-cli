import { XmlNode, XmlParser } from "./XmlParser";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { Rect } from "../shapes/Rect";
import { Circle } from "../shapes/Circle";
import { Ellipse } from "../shapes/Ellipse";
import { Line } from "../shapes/Line";
import { Text } from "../shapes/Text";

export interface ReadResult {
  width: number;
  height: number;
  shapes: Shape[];
  warnings: string[];
}

/** 读入 SVG：缺 id 的元素按 "标签名+序号" 自动补并输出警告。 */
export class SvgReader {
  private readonly used = new Set<string>();

  read(source: string): ReadResult {
    const root = XmlParser.parse(source);
    const warnings: string[] = [];
    const counter = new Map<string, number>();
    const width = num(root.attrs, "width", viewBoxSize(root.attrs, 0, 800));
    const height = num(root.attrs, "height", viewBoxSize(root.attrs, 1, 600));
    const shapes: Shape[] = [];
    for (const c of root.children) {
      if (c.tag === "#text") continue;
      if (!SUPPORTED.has(c.tag)) {
        warnings.push("warning: skipped unsupported element <" + c.tag + ">");
        continue;
      }
      shapes.push(this.toShape(c, warnings, counter));
    }
    return { width, height, shapes, warnings };
  }

  private toShape(node: XmlNode, warnings: string[], counter: Map<string, number>): Shape {
    let id = node.attrs.get("id") ?? "";
    if (id === "") {
      let n = (counter.get(node.tag) ?? 0) + 1;
      while (this.used.has(node.tag + n)) n++;
      counter.set(node.tag, n);
      id = node.tag + n;
      warnings.push("warning: assigned id " + id + " to unnamed <" + node.tag + ">");
    }
    this.used.add(id);
    const shape = this.construct(id, node, warnings, counter);
    if (shape === null) throw new Error("unsupported element: <" + node.tag + ">");
    const fill = node.attrs.get("fill");
    const stroke = node.attrs.get("stroke");
    const sw = node.attrs.get("stroke-width");
    if (fill !== undefined) shape.fill = fill;
    if (stroke !== undefined) shape.stroke = stroke;
    if (sw !== undefined) shape.strokeWidth = sw;
    return shape;
  }

  private construct(id: string, node: XmlNode, warnings: string[], counter: Map<string, number>): Shape | null {
    const a = node.attrs;
    switch (node.tag) {
      case "rect":
        return new Rect(id, num(a, "x", 0), num(a, "y", 0), num(a, "width", 0), num(a, "height", 0));
      case "circle":
        return new Circle(id, num(a, "cx", 0), num(a, "cy", 0), num(a, "r", 0));
      case "ellipse":
        return new Ellipse(id, num(a, "cx", 0), num(a, "cy", 0), num(a, "rx", 0), num(a, "ry", 0));
      case "line":
        return new Line(id, num(a, "x1", 0), num(a, "y1", 0), num(a, "x2", 0), num(a, "y2", 0));
      case "text":
        return new Text(id, num(a, "x", 0), num(a, "y", 0), node.text);
      case "g": {
        const g = new Group(id);
        for (const c of node.children) {
          if (c.tag === "#text") continue;
          if (!SUPPORTED.has(c.tag)) {
            warnings.push("warning: skipped unsupported element <" + c.tag + ">");
            continue;
          }
          g.appendChild(this.toShape(c, warnings, counter));
        }
        return g;
      }
    }
    return null;
  }
}

const SUPPORTED = new Set(["rect", "circle", "ellipse", "line", "text", "g"]);

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
