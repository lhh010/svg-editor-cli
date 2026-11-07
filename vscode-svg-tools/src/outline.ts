import { PosElement, parseSvgElements, SvgParseError } from "./parser";

/** 大纲节点：与 vscode 解耦的纯数据（可独立测试），extension 层映射为 DocumentSymbol。 */
export interface OutlineNode {
  /** "rect#start" 或 "text"（无 id 仅显示标签名）。 */
  name: string;
  container: boolean;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  /** 定位目标：开始标签区间。 */
  selStartLine: number;
  selStartChar: number;
  selEndLine: number;
  selEndChar: number;
  children: OutlineNode[];
}

/**
 * 解析文本为大纲树；XML 不完整/非法时返回 []（大纲暂时清空，扩展不崩溃）。
 * 根 <svg> 是树中第一个容器节点。
 */
export function buildOutline(text: string): OutlineNode[] {
  let els: PosElement[];
  try {
    els = parseSvgElements(text);
  } catch (e) {
    if (e instanceof SvgParseError) return [];
    throw e;
  }
  return els.map((el) => toNode(el, text));
}

function toNode(el: PosElement, text: string): OutlineNode {
  const children = el.children.map((c) => toNode(c, text));
  return {
    name: el.id !== null && el.id.length > 0 ? el.tag + "#" + el.id : el.tag,
    container: children.length > 0,
    ...rangeOf(el.start, el.end, text),
    ...selRangeOf(el.openTagStart, el.openTagEnd, text),
    children,
  };
}

function lineCol(text: string, offset: number): { line: number; char: number } {
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, char: offset - lineStart };
}

function rangeOf(start: number, end: number, text: string) {
  const a = lineCol(text, start);
  const b = lineCol(text, end);
  return { startLine: a.line, startChar: a.char, endLine: b.line, endChar: b.char };
}

function selRangeOf(start: number, end: number, text: string) {
  const a = lineCol(text, start);
  const b = lineCol(text, end);
  return { selStartLine: a.line, selStartChar: a.char, selEndLine: b.line, selEndChar: b.char };
}
