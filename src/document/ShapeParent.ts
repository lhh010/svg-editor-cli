import { Shape } from "../shapes/Shape";

/** 容器侧统一接口：画布根 SvgRoot 与 Group 同构，命令层无需区分。 */
export interface ShapeParent {
  appendChild(child: Shape): void;
  insertChildAt(child: Shape, index: number): void;
  removeChild(child: Shape): void;
  indexOf(child: Shape): number;
}
