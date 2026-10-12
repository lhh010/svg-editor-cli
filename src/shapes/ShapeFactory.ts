import { Shape } from "./Shape";
import { Rect } from "./Rect";
import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Line } from "./Line";
import { Text } from "./Text";
import { Group } from "./Group";
import { CliError } from "../errors/CliError";

type Creator = (id: string, params: string[]) => Shape;

/**
 * 图形工厂（Factory 模式）。
 * 按类型名分派是规范允许的两处名字分派之一（另一处是命令分发）。
 * 阶段二的插件化将把这里的注册表改为 ShapeProvider 插槽。
 */
export class ShapeFactory {
  private readonly creators = new Map<string, Creator>();

  constructor() {
    this.creators.set("rect", (id, p) => new Rect(id, num(p[0], "x"), num(p[1], "y"), num(p[2], "width"), num(p[3], "height")));
    this.creators.set("circle", (id, p) => new Circle(id, num(p[0], "cx"), num(p[1], "cy"), num(p[2], "r")));
    this.creators.set("ellipse", (id, p) => new Ellipse(id, num(p[0], "cx"), num(p[1], "cy"), num(p[2], "rx"), num(p[3], "ry")));
    this.creators.set("line", (id, p) => new Line(id, num(p[0], "x1"), num(p[1], "y1"), num(p[2], "x2"), num(p[3], "y2")));
    this.creators.set("text", (id, p) => new Text(id, num(p[0], "x"), num(p[1], "y"), str(p[2])));
    this.creators.set("g", (id) => new Group(id));
    this.creators.set("rect+", (id, p) => withFill(new Rect(id, num(p[0], "x"), num(p[1], "y"), num(p[2], "width"), num(p[3], "height")), p[4]));
    this.creators.set("circle+", (id, p) => withFill(new Circle(id, num(p[0], "cx"), num(p[1], "cy"), num(p[2], "r")), p[3]));
    this.creators.set("ellipse+", (id, p) => withFill(new Ellipse(id, num(p[0], "cx"), num(p[1], "cy"), num(p[2], "rx"), num(p[3], "ry")), p[4]));
    this.creators.set("line+", (id, p) => withStroke(new Line(id, num(p[0], "x1"), num(p[1], "y1"), num(p[2], "x2"), num(p[3], "y2")), p[4]));
  }

  /** 内置类型名集合（供 in-clause/参数个数预检）。 */
  static readonly BUILTIN = new Set(["rect", "circle", "ellipse", "line", "text", "g"]);

  knows(type: string): boolean {
    return this.creators.has(type) || this.creators.has(type + "+");
  }

  /** 解析参数个数并选择带/不带外观参数的构造器。 */
  create(type: string, id: string, params: string[]): Shape {
    if (!this.knows(type)) {
      throw new CliError("unknown shape type: " + type + " (is the plugin loaded?)");
    }
    const arity = ARITY.get(type)!; // 允许的参数个数区间
    const withLook = params.length === arity[1];
    const key = withLook && arity[1] > arity[0] ? type + "+" : type;
    if (params.length < arity[0] || params.length > arity[1]) {
      throw new CliError("bad parameters for " + type + ": expected " + USAGE.get(type));
    }
    return this.creators.get(key)!(id, params);
  }
}

const ARITY = new Map<string, [number, number]>([
  ["rect", [4, 5]],
  ["circle", [3, 4]],
  ["ellipse", [4, 5]],
  ["line", [4, 5]],
  ["text", [3, 3]],
  ["g", [0, 0]],
]);

const USAGE = new Map<string, string>([
  ["rect", "<x> <y> <w> <h> [fill]"],
  ["circle", "<cx> <cy> <r> [fill]"],
  ["ellipse", "<cx> <cy> <rx> <ry> [fill]"],
  ["line", "<x1> <y1> <x2> <y2> [stroke]"],
  ["text", '<x> <y> "content"'],
  ["g", ""],
]);

function num(v: string | undefined, name: string): number {
  if (v === undefined) throw new CliError("missing parameter: " + name);
  const n = Number(v);
  if (!Number.isFinite(n)) throw new CliError("invalid number: " + v);
  return n;
}

function str(v: string | undefined): string {
  if (v === undefined) throw new CliError('missing parameter: "content"');
  return v;
}

function withFill(s: Shape, fill: string | undefined): Shape {
  if (fill !== undefined) s.fill = fill;
  return s;
}

function withStroke(s: Shape, stroke: string | undefined): Shape {
  if (stroke !== undefined) s.stroke = stroke;
  return s;
}
