import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { ShapeParent } from "../document/ShapeParent";
import { Shape } from "../shapes/Shape";
import { CliError } from "../errors/CliError";
import { mustFindContainer, mustFind, holderOf } from "./Resolve";

export class AddtoCommand implements Command {
  private shape: Shape | null = null;
  private oldParent: ShapeParent | null = null;
  private oldIndex = -1;
  private targetLabel = "";

  constructor(private readonly doc: SvgDocument, private readonly gid: string, private readonly id: string) {}

  execute(): string {
    const target = mustFindContainer(this.doc, this.gid);
    const shape = mustFind(this.doc, this.id);
    // 目标容器位于被移动图形自己的子树内 -> 非法
    if (shape.isContainer && isDescendantOf(target, shape)) {
      throw new CliError("cannot move a container into its own descendant: " + this.id);
    }
    const parent = holderOf(this.doc, shape);
    this.oldParent = parent;
    this.oldIndex = parent.indexOf(shape);
    parent.removeChild(shape);
    target.appendChild(shape);
    this.shape = shape;
    this.targetLabel = target.label();
    return shape.label() + " added to " + this.targetLabel;
  }

  undo(): string {
    const shape = this.shape!;
    this.oldParent!.insertChildAt(shape, this.oldIndex);
    return shape.label() + " removed from " + this.targetLabel;
  }
}

function isDescendantOf(shape: Shape, maybeAncestor: Shape): boolean {
  let p: Shape | null = shape;
  while (p !== null) {
    if (p === maybeAncestor) return true;
    p = p.parent;
  }
  return false;
}
