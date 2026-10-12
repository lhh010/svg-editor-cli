import { Shape } from "../shapes/Shape";

/** show 命令的属性明细渲染。 */
export class ShowRenderer {
  render(shape: Shape): string[] {
    const parent = shape.parent !== null ? shape.parent.label() : "canvas";
    const lines = [shape.label() + "  parent=" + parent];
    for (const d of shape.detailLines()) lines.push("  " + d);
    return lines;
  }
}
