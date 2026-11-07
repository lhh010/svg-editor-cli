import { ShapeProvider, ShapeParseContext } from "../kernel/ExtensionPoints";
import { Shape } from "../shapes/Shape";
import { Rect } from "../shapes/Rect";
import { Circle } from "../shapes/Circle";
import { Ellipse } from "../shapes/Ellipse";
import { Line } from "../shapes/Line";
import { Text } from "../shapes/Text";
import { Group } from "../shapes/Group";
import { SvgElementNode } from "../io/XmlParser";
import { CliError } from "../errors/CliError";

/**
 * 内置六种图形的 ShapeProvider 实现（Phase 1 的 ShapeFactory 注册表逻辑原样迁移）。
 * 内置图形也走扩展点装配：默认装配激活本集合后，行为与 Phase 1 完全一致。
 */
function num(v: string | undefined, name: string, type: string): number {
  if (v === undefined) throw new CliError("missing parameter: " + name + " for " + type);
  const n = Number(v);
  if (!Number.isFinite(n)) throw new CliError("invalid number: " + v);
  return n;
}

abstract class LeafProvider implements ShapeProvider {
  abstract readonly typeName: string;
  get tagName(): string {
    return this.typeName;
  }
  abstract create(id: string, params: string[]): Shape;
  abstract parse(node: SvgElementNode, ctx: ShapeParseContext): Shape | null;
}

class RectProvider extends LeafProvider {
  readonly typeName = "rect";
  create(id: string, params: string[]): Shape {
    if (params.length < 4) throw new CliError("rect requires <x> <y> <w> <h> [fill]");
    const s = new Rect(id, num(params[0], "x", "rect"), num(params[1], "y", "rect"), num(params[2], "width", "rect"), num(params[3], "height", "rect"));
    if (params[4] !== undefined) s.fill = params[4];
    return s;
  }
  parse(node: SvgElementNode): Shape | null {
    return new Rect(node.attrs.get("id") ?? "", attr(node, "x"), attr(node, "y"), attr(node, "width"), attr(node, "height"));
  }
}

class CircleProvider extends LeafProvider {
  readonly typeName = "circle";
  create(id: string, params: string[]): Shape {
    if (params.length < 3) throw new CliError("circle requires <cx> <cy> <r> [fill]");
    const s = new Circle(id, num(params[0], "cx", "circle"), num(params[1], "cy", "circle"), num(params[2], "r", "circle"));
    if (params[3] !== undefined) s.fill = params[3];
    return s;
  }
  parse(node: SvgElementNode): Shape | null {
    return new Circle(node.attrs.get("id") ?? "", attr(node, "cx"), attr(node, "cy"), attr(node, "r"));
  }
}

class EllipseProvider extends LeafProvider {
  readonly typeName = "ellipse";
  create(id: string, params: string[]): Shape {
    if (params.length < 4) throw new CliError("ellipse requires <cx> <cy> <rx> <ry> [fill]");
    const s = new Ellipse(id, num(params[0], "cx", "ellipse"), num(params[1], "cy", "ellipse"), num(params[2], "rx", "ellipse"), num(params[3], "ry", "ellipse"));
    if (params[4] !== undefined) s.fill = params[4];
    return s;
  }
  parse(node: SvgElementNode): Shape | null {
    return new Ellipse(node.attrs.get("id") ?? "", attr(node, "cx"), attr(node, "cy"), attr(node, "rx"), attr(node, "ry"));
  }
}

class LineProvider extends LeafProvider {
  readonly typeName = "line";
  create(id: string, params: string[]): Shape {
    if (params.length < 4) throw new CliError("line requires <x1> <y1> <x2> <y2> [stroke]");
    const s = new Line(id, num(params[0], "x1", "line"), num(params[1], "y1", "line"), num(params[2], "x2", "line"), num(params[3], "y2", "line"));
    if (params[4] !== undefined) s.stroke = params[4];
    return s;
  }
  parse(node: SvgElementNode): Shape | null {
    return new Line(node.attrs.get("id") ?? "", attr(node, "x1"), attr(node, "y1"), attr(node, "x2"), attr(node, "y2"));
  }
}

class TextProvider extends LeafProvider {
  readonly typeName = "text";
  create(id: string, params: string[]): Shape {
    if (params.length < 3) throw new CliError('text requires <x> <y> "content"');
    return new Text(id, num(params[0], "x", "text"), num(params[1], "y", "text"), params[2]);
  }
  parse(node: SvgElementNode): Shape | null {
    return new Text(node.attrs.get("id") ?? "", attr(node, "x"), attr(node, "y"), node.text);
  }
}

function attr(node: SvgElementNode, key: string): number {
  const v = node.attrs.get(key);
  if (v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 普通 <g> 容器：接受任何 g。带 data-kind 的 g 若无对应插件认领（box 未安装），
 * 会在这里降级为普通分组并输出警告——插件式读回降级的缺省路径。
 */
export class GProvider implements ShapeProvider {
  readonly typeName = "g";
  get tagName(): string {
    return "g";
  }
  create(id: string): Group {
    return new Group(id);
  }
  parse(node: SvgElementNode, ctx: ShapeParseContext): Shape | null {
    const kind = node.attrs.get("data-kind");
    if (kind !== undefined) {
      // 有 data-kind 但前面的（更具体的）提供者未认领：降级为普通 g
      ctx.warn('warning: no plugin for data-kind "' + kind + '", degraded <g id="' + (node.attrs.get("id") ?? "") + '"> to plain group');
    }
    const group = new Group(node.attrs.get("id") ?? "");
    for (const c of node.children) {
      if (c.tag === "#text") continue;
      const child = ctx.parseChild(c);
      if (child !== null) group.appendChild(child);
    }
    return group;
  }
}


/** 内置六种图形的提供者集合（组合根注册用）。声明在类定义之后求值。 */
export class BuiltinShapeProviders {
  static readonly providers: ShapeProvider[] = [
    new RectProvider(),
    new CircleProvider(),
    new EllipseProvider(),
    new LineProvider(),
    new TextProvider(),
    new GProvider(),
  ];
}

