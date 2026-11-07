/**
 * 指标脚本：从 git 历史生成 docs/metrics/metrics.md（不接受手填）。
 * 用法：node scripts/metrics.mjs [oldRef] [newRef]   默认 final -> HEAD
 * 分类（按路径）：
 *   kernel  = src/{kernel,shapes,document,commands,io,core,view,cli}
 *   host    = src/host, src/builtin            （装配处 + 内置插件）
 *   plugins = plugins/**                        （可选插件包）
 *   tests   = src/tests                         （单独列出，不计入三类合计）
 *   vscode  = vscode-svg-tools/**               （单独列出，不混入 CLI 增量）
 * 行数口径：源码 .ts 行数（含注释与空行，含 packages 内 .ts）；排除 dist/node_modules。
 * 圈复杂度：决策关键字计数 +1（if/for/while/case/catch/&&/||/?:），按文件求和后分类汇总。
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const oldRef = process.argv[2] ?? "final";
const newRef = process.argv[3] ?? "HEAD";

function filesAt(ref) {
  const out = execSync(`git ls-tree -r --name-only ${ref}`, { encoding: "utf-8" });
  return out.split("\n").filter((f) => f.length > 0);
}

function contentAt(ref, file) {
  try {
    return execSync(`git show ${ref}:${JSON.stringify(file)}`, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return "";
  }
}

function category(path) {
  if (path.startsWith("src/tests") || path.startsWith("test-fixtures")) return "tests";
  if (path.startsWith("vscode-svg-tools")) return "vscode";
  if (path.startsWith("plugins/")) return "plugins";
  if (path.startsWith("src/host") || path.startsWith("src/builtin")) return "host";
  if (
    path.startsWith("src/kernel") || path.startsWith("src/shapes") || path.startsWith("src/document") ||
    path.startsWith("src/commands") || path.startsWith("src/io") || path.startsWith("src/core") ||
    path.startsWith("src/view") || path.startsWith("src/cli")
  ) return "kernel";
  return "other";
}

function metrics(files, ref) {
  const byCat = { kernel: {}, host: {}, plugins: {}, tests: {}, vscode: {}, other: {} };
  for (const f of files) {
    if (!f.endsWith(".ts") && !f.endsWith(".js") && !f.endsWith(".mjs")) continue;
    if (f.includes("node_modules") || f.startsWith("dist/")) continue;
    const src = contentAt(ref, f);
    const lines = src.length === 0 ? 0 : src.split("\n").length;
    const complexity = countComplexity(src);
    const cat = category(f);
    byCat[cat][f] = { lines, complexity };
  }
  return byCat;
}

function countComplexity(src) {
  const tokens = src.match(/\b(if|for|while|case|catch)\b|&&|\|\||\?\s|else\s+if/g) ?? [];
  return tokens.length + 1;
}

function summarize(byCat) {
  const out = {};
  for (const cat of ["kernel", "host", "plugins", "tests", "vscode"]) {
    const files = byCat[cat];
    const list = Object.entries(files);
    out[cat] = {
      files: list.length,
      lines: list.reduce((a, [, m]) => a + m.lines, 0),
      complexity: list.reduce((a, [, m]) => a + m.complexity, 0),
    };
  }
  return out;
}

function fileList(byCat, cat) {
  return Object.entries(byCat[cat])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([f, m]) => "| " + f + " | " + m.lines + " | " + m.complexity + " |")
    .join("\n");
}

const oldM = metrics(filesAt(oldRef), oldRef);
const newM = metrics(filesAt(newRef), newRef);
const oldS = summarize(oldM);
const newS = summarize(newM);

let md = "# Metrics（`final` -> `" + newRef + "`）\n\n";
md += "> 由 \`node scripts/metrics.mjs\` 从 git 历史自动生成；行数含注释空行；圈复杂度为决策关键字计数启发式。\n\n";
md += "## 汇总（CLI 范围：kernel / host / plugins）\n\n";
md += "| 类别 | final 文件数 | final 行数 | p2 文件数 | p2 行数 | 行数增量 | 复杂度(final -> p2) |\n|-|-|-|-|-|-|-|\n";
for (const cat of ["kernel", "host", "plugins"]) {
  md += "| " + cat + " | " + oldS[cat].files + " | " + oldS[cat].lines + " | " + newS[cat].files + " | " + newS[cat].lines + " | +" + (newS[cat].lines - oldS[cat].lines) + " | " + oldS[cat].complexity + " -> " + newS[cat].complexity + " |\n";
}
md += "\n## 单独列出（不计入 CLI 重构增量）\n\n| 类别 | final 文件/行数 | p2 文件/行数 |\n|-|-|-|\n";
for (const cat of ["tests", "vscode"]) {
  md += "| " + cat + " | " + oldS[cat].files + " / " + oldS[cat].lines + " | " + newS[cat].files + " / " + newS[cat].lines + " |\n";
}
for (const cat of ["kernel", "host", "plugins", "tests", "vscode"]) {
  md += "\n## " + cat + " 文件清单（p2）\n\n| 文件 | 行数 | 复杂度 |\n|-|-|-|\n" + fileList(newM, cat) + "\n";
}

mkdirSync("docs/metrics", { recursive: true });
writeFileSync("docs/metrics/metrics.md", md, "utf-8");
console.log("docs/metrics/metrics.md written");
console.log(JSON.stringify(newS, null, 1));
