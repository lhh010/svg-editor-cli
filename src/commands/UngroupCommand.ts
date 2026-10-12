import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { ShapeParent } from "../document/ShapeParent";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { CliError } from "../errors/CliError";
import { mustFind, holderOf } from "./Resolve";

export class UngroupCommand implements Command {
  private group: Group | null = null;
  private parent: ShapeParent | null = null;
  private index = -1;
  private children: Shape[] = [];

  constructor(private readonly doc: SvgDocument, private readonly gid: string) {}

  execute(): string {
    const shape = mustFind(this.doc, this.gid);
    if (!(shape instanceof Group)) throw new CliError("not a container: " + this.gid);
    if (shape.kindLabel !== null) throw new CliError("cannot ungroup composite shape: " + this.gid);
    if (shape.parent === null) throw new CliError("cannot ungroup top-level container: " + this.gid);
    const parent = holderOf(this.doc, shape);
    this.index = parent.indexOf(shape);
    this.children = [...shape.children];
    parent.removeChild(shape);
    let at = this.index;
    for (const c of this.children) {
      parent.insertChildAt(c, at++);
    }
    this.doc.releaseId(this.gid);
    this.group = shape;
    this.parent = parent;
    return shape.label() + " ungrouped (" + this.children.length + " children promoted)";
  }

  undo(): string {
    const group = this.group!;
    this.parent!.removeChild(group);
    for (const c of this.children) group.appendChild(c);
    this.parent!.insertChildAt(group, this.index);
    this.doc.registerId(this.gid);
    return group.label() + " restored";
  }
}
