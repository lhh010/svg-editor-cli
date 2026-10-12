import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { Shape } from "../shapes/Shape";
import { mustFind } from "./Resolve";

export class SetCommand implements Command {
  private shape: Shape | null = null;
  private oldValue: string | null = null;

  constructor(private readonly doc: SvgDocument, private readonly id: string, private readonly attr: string, private readonly value: string) {}

  execute(): string {
    const shape = mustFind(this.doc, this.id);
    this.oldValue = shape.setAttribute(this.attr, this.value); // 白名单外抛 InvalidAttributeError
    this.shape = shape;
    return shape.label() + " updated: " + this.describe(this.value);
  }

  undo(): string {
    const shape = this.shape!;
    if (this.oldValue === null) {
      shape.clearAttribute(this.attr);
      return shape.label() + " updated: " + this.attr + "= (default)";
    }
    shape.setAttribute(this.attr, this.oldValue);
    return shape.label() + " updated: " + this.describe(this.oldValue);
  }

  private describe(v: string): string {
    return this.attr === "text" ? this.attr + '="' + v + '"' : this.attr + "=" + v;
  }
}
