import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { ShapeParent } from "../document/ShapeParent";
import { ShapeFactory } from "../shapes/ShapeFactory";
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
    private readonly factory: ShapeFactory,
    private readonly type: string,
    private readonly id: string,
    private readonly params: string[],
    containerId: string | null
  ) {
    this.containerId = containerId;
  }

  execute(): string {
    if (!this.factory.knows(this.type)) {
      throw new CliError("unknown shape type: " + this.type + " (is the plugin loaded?)");
    }
    if (this.doc.hasId(this.id)) throw new CliError("id already exists: " + this.id);
    let parent: ShapeParent = this.doc.root;
    if (this.containerId !== null) {
      const c: Group = mustFindContainer(this.doc, this.containerId);
      parent = c;
    }
    const shape = this.factory.create(this.type, this.id, this.params);
    parent.appendChild(shape);
    this.doc.registerId(this.id);
    this.shape = shape;
    this.parent = parent;
    return shape.label() + " created" + (shape.parent !== null ? " in " + parentLabel(shape) : "");
  }

  undo(): string {
    const s = this.shape!;
    this.parent!.removeChild(s);
    this.doc.releaseId(s.id);
    return s.label() + " removed";
  }
}
