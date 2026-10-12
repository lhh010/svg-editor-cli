import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { ShapeParent } from "../document/ShapeParent";
import { Shape } from "../shapes/Shape";
import { mustFind, holderOf } from "./Resolve";

/** front = 同级最前（最后渲染，视觉最上层）；back = 同级最后。 */
export class ZOrderCommand implements Command {
  private shape: Shape | null = null;
  private parent: ShapeParent | null = null;
  private index = -1;

  constructor(private readonly doc: SvgDocument, private readonly id: string, private readonly front: boolean) {}

  execute(): string {
    const shape = mustFind(this.doc, this.id);
    const parent = holderOf(this.doc, shape);
    this.index = parent.indexOf(shape);
    parent.removeChild(shape);
    if (this.front) parent.appendChild(shape);
    else parent.insertChildAt(shape, 0);
    this.shape = shape;
    this.parent = parent;
    return shape.label() + " moved to " + (this.front ? "front" : "back");
  }

  undo(): string {
    const shape = this.shape!;
    this.parent!.removeChild(shape);
    this.parent!.insertChildAt(shape, this.index);
    return shape.label() + " moved back to previous z-order";
  }
}
