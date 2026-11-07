import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { ShapeParent } from "../document/ShapeParent";
import { KernelRegistries } from "../kernel/Registries";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { CliError } from "../errors/CliError";
import { mustFindContainer, parentLabel } from "./Resolve";

export class CreateCommand implements Command {
  private shape: Shape | null = null;
  private parent: ShapeParent | null = null;
  private readonly containerId: string | null;

  constructor(
    private readonly doc: SvgDocument,
    private readonly registries: KernelRegistries,
    private readonly type: string,
    private readonly id: string,
    private readonly params: string[],
    containerId: string | null
  ) {
    this.containerId = containerId;
  }

  execute(): string {
    if (!this.registries.shapes.has(this.type)) {
      throw new CliError("unknown shape type: " + this.type + " (is the plugin loaded?)");
    }
    if (this.doc.hasId(this.id)) throw new CliError("id already exists: " + this.id);
    let parent: ShapeParent = this.doc.root;
    if (this.containerId !== null) {
      parent = mustFindContainer(this.doc, this.containerId);
    }
    const shape = this.registries.shapes.create(this.type, this.id, this.params);
    // 子树 id 冲突预检：复合类型（如 box）任一子部件 id 冲突则整条命令失败，不留残迹
    for (const sid of subtreeIds(shape)) {
      if (this.doc.hasId(sid)) throw new CliError("id already exists: " + sid);
    }
    parent.appendChild(shape);
    for (const sid of subtreeIds(shape)) this.doc.registerId(sid);
    this.shape = shape;
    this.parent = parent;
    const echo = shape.creationEcho();
    if (echo !== null) {
      return echo + (shape.parent !== null && shape.parent instanceof Group ? " in " + parentLabel(shape) : "");
    }
    return shape.echoLabel() + " created" + (shape.parent !== null ? " in " + parentLabel(shape) : "");
  }

  undo(): string {
    const s = this.shape!;
    this.parent!.removeChild(s);
    for (const id of subtreeIds(s)) this.doc.releaseId(id);
    return s.echoLabel() + " removed";
  }
}

export function subtreeIds(shape: Shape): string[] {
  return shape instanceof Group ? shape.subtreeShapes().map((s) => s.id) : [shape.id];
}
