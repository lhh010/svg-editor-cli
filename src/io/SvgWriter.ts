import { SvgDocument } from "../document/SvgDocument";
import { Shape } from "../shapes/Shape";

/** 序列化当前文档为标准 SVG 文本（2 空格缩进，元素顺序即 z-order）。 */
export class SvgWriter {
  serialize(doc: SvgDocument): string {
    const parts: string[] = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        doc.width +
        '" height="' +
        doc.height +
        '" viewBox="0 0 ' +
        doc.width +
        " " +
        doc.height +
        '">'
    );
    for (const s of doc.root.children as readonly Shape[]) {
      parts.push(s.toXml("  "));
    }
    parts.push("</svg>");
    return parts.join("\n") + "\n";
  }
}
