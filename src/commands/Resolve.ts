import { SvgDocument } from "../document/SvgDocument";
import { ShapeParent } from "../document/ShapeParent";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { CliError } from "../errors/CliError";

/** 命令层通用的解析与挂载 helper。 */
export function mustFind(doc: SvgDocument, id: string): Shape {
  const s = doc.findById(id);
  if (s === null) throw new CliError("no such shape: " + id);
  return s;
}

export function mustFindContainer(doc: SvgDocument, id: string): Group {
  const s = doc.findById(id);
  if (s === null) throw new CliError("no such container: " + id);
  if (!(s instanceof Group)) throw new CliError("not a container: " + id);
  return s;
}

/** 图形当前所属容器；根级图形返回画布根。 */
export function holderOf(doc: SvgDocument, shape: Shape): ShapeParent {
  return shape.parent ?? doc.root;
}

export function parentLabel(shape: Shape): string {
  return shape.parent !== null ? shape.parent.label() : "canvas";
}
