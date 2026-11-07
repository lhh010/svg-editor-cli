import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { Shape } from "../shapes/Shape";
import { Group } from "../shapes/Group";
import { mustFind, holderOf, parentLabel } from "./Resolve";
import { CliError } from "../errors/CliError";

export class DeleteCommand implements Command {
  private shape: Shape | null = null;
  private parent: ReturnType<typeof holderOf> | null = null;
  private index = -1;

  constructor(private readonly doc: SvgDocument, private readonly id: string) {}

  execute(): string {
    const shape = mustFind(this.doc, this.id);
    const parent = holderOf(this.doc, shape);
    if (shape.parent !== null && !shape.parent.canDetach(shape)) {
      throw new CliError("cannot detach protected child: " + this.id);
    }
    this.index = parent.indexOf(shape);
    parent.removeChild(shape);
    for (const s of subtreeIds(shape)) this.doc.releaseId(s);
    this.shape = shape;
    this.parent = parent;
    return shape.echoLabel() + " deleted";
  }

  undo(): string {
    const s = this.shape!;
    this.parent!.insertChildAt(s, this.index);
    for (const id of subtreeIds(s)) this.doc.registerId(id);
    return s.echoLabel() + " restored " + (s.parent !== null ? "into " + parentLabel(s) : "onto canvas");
  }
}

function subtreeIds(shape: Shape): string[] {
  return shape instanceof Group ? shape.subtreeShapes().map((s) => s.id) : [shape.id];
}
