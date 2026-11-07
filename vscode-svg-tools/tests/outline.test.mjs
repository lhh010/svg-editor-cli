/** 大纲逻辑测试（不依赖 VSCode，node 直接运行）：嵌套分组、无 id、编辑更新、不完整 XML。 */
import { buildOutline } from "../out/outline.js";

let passed = 0;
let failed = 0;
function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else {
    failed++;
    console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a);
  }
}

const sample = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">',
  '  <g id="flow">',
  '    <rect id="start" x="120" y="100" width="160" height="60"/>',
  '    <text x="20" y="40">hi</text>',
  '    <g id="inner">',
  '      <circle id="c1" cx="5" cy="5" r="2"/>',
  "    </g>",
  "  </g>",
  "</svg>",
].join("\n");

// 1. 嵌套分组与层级
const tree = buildOutline(sample);
eq("root name", tree[0].name, "svg");
eq("root children", tree[0].children.map((c) => c.name), ["g#flow"]);
const flow = tree[0].children[0];
eq("flow children", flow.children.map((c) => c.name), ["rect#start", "text", "g#inner"]);
eq("inner children", flow.children[2].children.map((c) => c.name), ["circle#c1"]);
eq("container flag", flow.container, true);
eq("leaf flag", flow.children[0].container, false);

// 2. 定位：rect#start 的开始标签在第 3 行（0 基）
const rect = flow.children[0];
eq("rect sel line", rect.selStartLine, 3);
eq("rect sel char", rect.selStartChar, 4);
eq("rect range start", [rect.startLine, rect.startChar], [3, 4]);

// 3. 无 id 元素仅显示标签名（上面的 text 已验证）
eq("no-id name", flow.children[1].name, "text");

// 4. 编辑更新 = 纯函数：同输入同输出，改文本后重建即得新树
const edited = sample.replace('id="start"', 'id="start-node"');
eq("edit updates", buildOutline(edited)[0].children[0].children[0].name, "rect#start-node");

// 5. 不完整 XML：返回空大纲且不抛错
eq("incomplete tag", buildOutline("<svg><g id=\"a\"><rect"), []);
eq("unclosed attr", buildOutline('<svg><g id="a></g></svg>'), []);
eq("mismatched close", buildOutline("<svg><g></rect></svg>"), []);
eq("empty text", buildOutline(""), []);

console.log("passed: " + passed + ", failed: " + failed);
if (failed > 0) process.exit(1);
