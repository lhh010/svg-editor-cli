import { KernelRegistries } from "../../src/kernel/Registries";
import { createApp, activateBuiltins, activatePlugin } from "../../src/host/Assembly";
import { CommandDispatcher } from "../../src/cli/CommandDispatcher";
import pluginBox from "./index";

/** box 插件独立测试：自己的扩展上下文，不依赖其他插件。 */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function expect(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(label + " | expected " + e + " | actual " + a); }
}

async function run(dispatcher: CommandDispatcher, commands: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const c of commands) {
    try { out.push(...(await dispatcher.handle(c))); }
    catch (e) { out.push("error: " + (e instanceof Error ? e.message : String(e))); }
  }
  return out;
}

export async function runBoxTests(): Promise<void> {
  const registries = new KernelRegistries();
  activateBuiltins(registries);
  const app = createApp(registries);
  activatePlugin(registries, pluginBox);
  const d = app.dispatcher;

  // 1. §6.1 版本 B 会话核心行
  const s = await run(d, [
    "init 800 600",
    'create box n1 120 100 160 60 "开始"',
    'create box n2 520 100 160 60 "处理数据"',
    "create line arrow1 280 130 520 130 black",
    "group flowchart n1 n2 arrow1",
    "move n2 0 100",
    "undo",
    "set n2 fill #f5a623",
    'set n2 label "处理数据 v2"',
    "undo",
    "tree",
  ]);
  expect("create echo", s[1], "box#n1 created (g#n1 + rect#n1-rect + text#n1-label)");
  expect("group with boxes", s[4], "g#flowchart created with 3 children");
  expect("move box", s[5], "box#n2 moved by (0,100)");
  expect("undo move", s[6], "box#n2 moved back by (0,-100)");
  expect("set fill", s[7], "box#n2 fill propagated to n2-rect");
  expect("set label", s[8], 'box#n2 label updated: "处理数据 v2"');
  expect("undo label", s[9], 'box#n2 label restored: "处理数据"');
  expect("tree box line", s[10], "svg (800x600)");
  expect("tree child line", s[11], "\u2514\u2500\u2500 g#flowchart");

  // 2. tree 细节：box 的子部件与几何（无标签插件时无 (box) 标注）
  const t = await run(d, ["tree n1"]);
  expect("tree box root", t[0], "g#n1");
  expect("tree box rect", t[1], "\u251C\u2500\u2500 rect#n1-rect   x=120 y=100 w=160 h=60 fill=#4a90d9");
  expect("tree box label", t[2], "\u2514\u2500\u2500 text#n1-label  (140,135) \"开始\"");

  // 3. set 后几何随行：move 后 rect/label 同步
  const mv = await run(d, ["move n1 0 100", "show n1-rect"]);
  expect("box move syncs rect", mv[2].includes("y=200"), true);

  // 4. ungroup 拒绝；子部件保护
  const guard = await run(d, ["ungroup n1", "delete n1-rect", "delete n1-label", "addto flowchart n1-rect", "group bad n1-rect arrow1", "delete n1"]);
  expect("ungroup composite", guard[0], "error: cannot ungroup composite shape: n1");
  expect("protected rect delete", guard[1], "error: cannot detach protected child: n1-rect");
  expect("protected label delete", guard[2], "error: cannot detach protected child: n1-label");
  expect("protected addto", guard[3], "error: cannot detach protected child: n1-rect");
  expect("protected group", guard[4], "error: cannot detach protected child: n1-rect");
  expect("whole box deletes", guard[5], "box#n1 deleted");

  // 5. 序列化与读回（装了插件；写到临时目录避免污染仓库）
  const tmpFile = require("node:path").join(require("node:os").tmpdir(), "box-rt-p2.svg");
  const rt = await run(d, [
    'create box keep 0 0 50 20 "K"',
    "save " + tmpFile,
    "read " + tmpFile,
    "show keep-rect",
    'set keep label "K2"',
  ]);
  expect("box roundtrip read", rt[2].startsWith("read " + tmpFile + " ("), true);
  expect("box roundtrip is box", rt[6], 'box#keep label updated: "K2"');

  // 6. id 冲突：整条命令失败不留残迹
  const conflict = await run(d, [
    "init 100 100",
    "create rect n1-rect 0 0 5 5",
    'create box n1 10 10 50 20 "X"',
    "tree",
  ]);
  expect("box id conflict", conflict[2], "error: id already exists: n1-rect");
  expect("no partial box", conflict[3], "svg (100x100)");
  expect("only rect present", conflict[4], "\u2514\u2500\u2500 rect#n1-rect  x=0 y=0 w=5 h=5");

  // 7. 属性处理器：fill/label 的 undo/redo 单元；一次 undo 恢复整体
  const undoUnit = await run(d, ["init 100 100", 'create box b1 0 0 60 30 "T"', "set b1 fill red", "undo", "show b1-rect", "redo", "show b1-rect"]);
  // 撤销恢复为模板默认色 #4a90d9，重做恢复为 red（一次 set = 一个 undo 单元）
  expect("set fill undone", undoUnit[6].includes("fill=#4a90d9"), true);
  expect("set fill redone", undoUnit[10].includes("fill=red"), true);

  console.log("box suite: passed " + passed + ", failed " + failed);
  if (failures.length > 0) console.log(failures.join("\n"));
  if (failed > 0) process.exitCode = 1;
}

export async function runBoxDegradeTests(): Promise<void> {
  // 未装 box 插件读回 data-kind="box"：降级为普通 g + 警告（内核 GProvider 缺省行为）
  const registries = new KernelRegistries();
  activateBuiltins(registries);
  const app = createApp(registries);
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const tmp = path.join(os.tmpdir(), "box-degrade-" + Date.now() + ".svg");
  fs.writeFileSync(tmp, '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><g id="n1" data-kind="box"><rect id="n1-rect" x="1" y="2" width="3" height="4"/><text id="n1-label" x="9" y="9">T</text></g></svg>');
  try {
    const out: string[] = [];
    try { out.push(...(await app.dispatcher.handle("read " + tmp))); } catch (e) { out.push("error: " + (e instanceof Error ? e.message : String(e))); }
    out.push(...(await app.dispatcher.handle("tree")));
    expect("degrade warning", out[0], 'warning: no plugin for data-kind "box", degraded <g id="n1"> to plain group');
    expect("degrade read ok", out[1], "read " + tmp + " (3 elements)");
    expect("degrade tree root", out[2], "svg (100x100)");
    expect("degrade as plain g", out[3], "\u2514\u2500\u2500 g#n1");
    const ug = await app.dispatcher.handle("ungroup n1");
    expect("degraded g can ungroup", ug[0], "g#n1 ungrouped (2 children promoted)");
  } finally {
    fs.unlinkSync(tmp);
  }
  console.log("box degrade suite: passed " + passed + ", failed " + failed);
  if (failures.length > 0) console.log(failures.join("\n"));
}
