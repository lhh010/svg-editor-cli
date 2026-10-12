import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { ShapeParent } from "../document/ShapeParent";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { CliError } from "../errors/CliError";
import { mustFind, holderOf } from "./Resolve";

interface Placement {
  shape: Shape;
  parent: ShapeParent;
  index: number;
}

export class GroupCommand implements Command {
  private group: Group | null = null;
  private placements: Placement[] = [];

  constructor(private readonly doc: SvgDocument, private readonly newGid: string, private readonly ids: string[]) {}

  execute(): string {
    if (this.doc.hasId(this.newGid)) throw new CliError("id already exists: " + this.newGid);
    const seen = new Set<string>();
    const shapes: Shape[] = [];
    for (const id of this.ids) {
      if (seen.has(id)) throw new CliError("duplicate id in group: " + id);
      seen.add(id);
      shapes.push(mustFind(this.doc, id));
    }
    for (const container of shapes) {
      if (!(container instanceof Group)) continue;
      for (const other of shapes) {
        if (other !== container && container.isAncestorOf(other)) {
          throw new CliError("cannot group a container into its own descendant: " + container.id);
        }
      }
    }
    const group = new Group(this.newGid);
    this.placements = shapes.map((s) => {
      const parent = holderOf(this.doc, s);
      return { shape: s, parent, index: parent.indexOf(s) };
    });
    for (const p of this.placements) p.parent.removeChild(p.shape);
    for (const s of shapes) group.appendChild(s);
    this.doc.root.appendChild(group);
    this.doc.registerId(this.newGid);
    this.group = group;
    return group.label() + " created with " + shapes.length + " children";
  }

  undo(): string {
    const ordered = [...this.placements].sort((a, b) => a.index - b.index);
    for (const p of ordered) {
      p.parent.insertChildAt(p.shape, p.index);
    }
    this.doc.root.removeChild(this.group!);
    this.doc.releaseId(this.newGid);
    this.group = null;
    this.placements = [];
    return "g#" + this.newGid + " dissolved, children restored";
  }
}
