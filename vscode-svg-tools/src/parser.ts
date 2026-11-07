/**
 * 带位置信息的极简 XML 解析（供大纲定位使用）。
 * 与 Phase 1 CLI 的 XmlParser 相比：这里必须输出每个元素的源码区间，
 * Phase 1 解析器不携带位置信息，无法直接复用（详见 doc/README.md A.3 节）。
 * 解析失败抛 SvgParseError，由调用者决定降级（清空大纲，不崩溃）。
 */

export interface PosElement {
  tag: string;
  id: string | null;
  /** 整个元素（含闭合标签）的字符偏移区间。 */
  start: number;
  end: number;
  /** 开始标签（含属性）的字符偏移区间，作为定位目标。 */
  openTagStart: number;
  openTagEnd: number;
  children: PosElement[];
}

export class SvgParseError extends Error {}

export function parseSvgElements(text: string): PosElement[] {
  const p = new Scanner(text);
  return p.parseTop();
}

class Scanner {
  private i = 0;
  constructor(private readonly s: string) {}

  parseTop(): PosElement[] {
    const out: PosElement[] = [];
    while (this.i < this.s.length) {
      const lt = this.s.indexOf("<", this.i);
      if (lt < 0) break;
      this.i = lt;
      if (this.startsWith("<!--")) {
        this.skipThrough("-->");
        continue;
      }
      if (this.startsWith("<?") || this.startsWith("<!")) {
        this.skipThrough(">");
        continue;
      }
      if (this.startsWith("</")) {
        throw new SvgParseError("unexpected close tag at " + lt);
      }
      out.push(this.parseElement());
    }
    return out;
  }

  private startsWith(prefix: string): boolean {
    return this.s.startsWith(prefix, this.i);
  }

  private skipThrough(marker: string): void {
    const at = this.s.indexOf(marker, this.i);
    if (at < 0) throw new SvgParseError("unterminated construct at " + this.i);
    this.i = at + marker.length;
  }

  private parseElement(): PosElement {
    const openTagStart = this.i;
    const gt = this.findTagEnd();
    let body = this.s.slice(this.i + 1, gt);
    this.i = gt + 1;
    const selfClosing = body.endsWith("/");
    if (selfClosing) body = body.slice(0, -1);
    const { tag, id } = parseOpenTag(body);
    const el: PosElement = { tag, id, start: openTagStart, end: gt + 1, openTagStart, openTagEnd: gt + 1, children: [] };
    if (selfClosing) return el;
    // 子节点直到配对闭合标签
    for (;;) {
      const lt = this.s.indexOf("<", this.i);
      if (lt < 0) throw new SvgParseError("missing close tag for <" + tag + ">");
      if (this.s.startsWith("</", lt)) {
        const gt2 = this.s.indexOf(">", lt);
        if (gt2 < 0) throw new SvgParseError("missing > for close tag of <" + tag + ">");
        const closing = this.s.slice(lt + 2, gt2).trim();
        if (closing !== tag) throw new SvgParseError("mismatched close </" + closing + "> for <" + tag + ">");
        this.i = gt2 + 1;
        el.end = gt2 + 1;
        return el;
      }
      if (this.s.startsWith("<!--", lt)) {
        this.i = lt;
        this.skipThrough("-->");
        continue;
      }
      this.i = lt;
      el.children.push(this.parseElement());
    }
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
    throw new SvgParseError("unclosed tag at " + this.i);
  }
}

function parseOpenTag(body: string): { tag: string; id: string | null } {
  const m = /^([A-Za-z][\w.:-]*)/.exec(body);
  if (!m) throw new SvgParseError("malformed tag <" + body + ">");
  const idRe = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/;
  const im = idRe.exec(body);
  return { tag: m[1], id: im !== null ? im[1] ?? im[2] ?? null : null };
}
