export interface Token {
  value: string;
  quoted: boolean;
}

/** 命令行分词：双引号包裹的参数（可含空格）作为一个 token，并保留 quoted 标记。 */
export class Tokenizer {
  static tokenize(line: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < line.length) {
      while (i < line.length && /\s/.test(line[i])) i++;
      if (i >= line.length) break;
      if (line[i] === '"') {
        const end = line.indexOf('"', i + 1);
        if (end < 0) throw new Error("unterminated quoted string");
        tokens.push({ value: line.slice(i + 1, end), quoted: true });
        i = end + 1;
      } else {
        let j = i;
        while (j < line.length && !/\s/.test(line[j])) j++;
        tokens.push({ value: line.slice(i, j), quoted: false });
        i = j;
      }
    }
    return tokens;
  }
}
