import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { Shape } from "../shapes/Shape";
import { Shape as S } from "../shapes/Shape";
import { mustFind } from "./Resolve";

export class MoveCommand implements Command {
  private shape: Shape | null = null;

  constructor(private readonly doc: SvgDocument, private readonly id: string, private readonly dx: number, private readonly dy: number) {}

  execute(): string {
    const shape = mustFind(this.doc, this.id);
    this.shape = shape;
    if (shape.isContainer) {
      shape.moveBy(this.dx, this.dy);
      return shape.label() + " moved by (" + S.fmt(this.dx) + "," + S.fmt(this.dy) + ")";
    }
    shape.moveBy(this.dx, this.dy);
    const [ax, ay] = shape.anchor();
    return shape.label() + " moved to (" + S.fmt(ax) + "," + S.fmt(ay) + ")";
  }

  undo(): string {
    const shape = this.shape!;
    shape.moveBy(-this.dx, -this.dy);
    if (shape.isContainer) {
      return shape.label() + " moved back by (" + S.fmt(-this.dx) + "," + S.fmt(-this.dy) + ")";
    }
    const [ax, ay] = shape.anchor();
    return shape.label() + " moved back to (" + S.fmt(ax) + "," + S.fmt(ay) + ")";
  }
}
