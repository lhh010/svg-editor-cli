import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { Shape, InvalidAttributeError } from "../shapes/Shape";
import { Shape as S } from "../shapes/Shape";
import { mustFind } from "./Resolve";
import { CliError } from "../errors/CliError";

export class ScaleCommand implements Command {
  private shape: Shape | null = null;

  constructor(private readonly doc: SvgDocument, private readonly id: string, private readonly factor: number) {}

  execute(): string {
    if (!(this.factor > 0)) throw new CliError("scale factor must be positive");
    const shape = mustFind(this.doc, this.id);
    this.shape = shape;
    shape.scaleBy(this.factor);
    return shape.label() + " scaled by " + S.fmt(this.factor);
  }

  undo(): string {
    const shape = this.shape!;
    shape.scaleBy(1 / this.factor);
    void InvalidAttributeError;
    return shape.label() + " scaled by " + S.fmt(Math.round((1 / this.factor) * 1e6) / 1e6);
  }
}
