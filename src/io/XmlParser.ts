/** 极简 XML 解析：只覆盖 SVG 文档所需子集（元素/属性/文本，忽略注释与声明）。 */
export interface XmlNode {
  tag: string;
  attrs: Map<string, string>;
  children: XmlNode[]; // 文本节点以 tag="#text" 表示
  text: string;        // 便捷字段：仅元素自身直接文本
}

export class XmlParser {
  static parse(src: string): XmlNode {
    const s = src
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\?[\s\S]*?\?>/g, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "");
    const p = new XmlParser(s);
    const root = p.scanForSvg();
    if (!root) throw new Error("not an svg document: missing <svg> root");
    return root;
  }

  private i = 0;
  private constructor(private readonly s: string) {}

  private scanForSvg(): XmlNode | null {
    while (this.i < this.s.length) {
      const lt = this.s.indexOf("<", this.i);
      if (lt < 0) return null;
      this.i = lt;
      if (this.s.startsWith("<svg", this.i)) return this.parseElement();
      this.i = this.s.indexOf(">", this.i) + 1; // 跳过其他顶层标签
      if (this.i === 0) return null;
    }
    return null;
  }

  private parseElement(): XmlNode {
    // 当前位置是 "<tag ..."，读取到配对的 '>'（跳过引号内的 '>'）
    const gt = this.findTagEnd();
    let body = this.s.slice(this.i + 1, gt);
    this.i = gt + 1;
    const selfClosing = body.endsWith("/");
    if (selfClosing) body = body.slice(0, -1);
    const { tag, attrs } = this.parseOpenTag(body);
    const node: XmlNode = { tag, attrs, children: [], text: "" };
    if (!selfClosing) {
      node.children = this.parseChildren(tag);
      node.text = node.children
        .filter((c) => c.tag === "#text")
        .map((c) => c.text)
        .join(" ")
        .trim();
    }
    return node;
  }

  /** 解析子节点直到遇到当前层的闭合标签。 */
  private parseChildren(tag: string): XmlNode[] {
    const kids: XmlNode[] = [];
    let buf = "";
    const flush = (): void => {
      const t = buf.trim();
      if (t.length > 0) kids.push({ tag: "#text", attrs: new Map(), children: [], text: unescapeXml(t) });
      buf = "";
    };
    while (this.i < this.s.length) {
      const lt = this.s.indexOf("<", this.i);
      if (lt < 0) {
        buf += this.s.slice(this.i);
        this.i = this.s.length;
        break;
      }
      buf += this.s.slice(this.i, lt);
      this.i = lt;
      if (this.s.startsWith("</", this.i)) {
        const gt = this.s.indexOf(">", this.i);
        const closing = this.s.slice(this.i + 2, gt).trim();
        if (closing !== tag) throw new Error("mismatched close tag: </" + closing + "> for <" + tag + ">");
        this.i = gt + 1;
        break;
      }
      flush();
      kids.push(this.parseElement());
    }
    flush();
    return kids;
  }

  private findTagEnd(): number {
    let j = this.i;
    let quote: string | null = null;
    while (j < this.s.length) {
      const c = this.s[j];
      if (quote !== null) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === ">") {
        return j;
      }
      j++;
    }
    throw new Error("malformed xml: unclosed tag near '" + this.s.slice(this.i, this.i + 30) + "'");
  }

  private parseOpenTag(body: string): { tag: string; attrs: Map<string, string> } {
    const m = /^([A-Za-z][\w.:-]*)/.exec(body);
    if (!m) throw new Error("malformed tag: <" + body + ">");
    const attrs = new Map<string, string>();
    const attrRe = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(body)) !== null) {
      attrs.set(am[1], unescapeXml(am[2] ?? am[3] ?? ""));
    }
    return { tag: m[1], attrs };
  }
}

export function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}
