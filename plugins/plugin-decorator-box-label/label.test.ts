import { KernelRegistries } from "../../src/kernel/Registries";
import { createApp, activateBuiltins, activatePlugin } from "../../src/host/Assembly";
import pluginStar from "../plugin-decorator-star";
import pluginBoxLabel from "./index";
import pluginBox from "../plugin-shape-box/index";

/** 两个标签并存且互不感知：注册顺序决定拼接顺序（star 先注册 -> * 在 (box) 前？行尾顺序 = 注册顺序）。 */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function expect(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(label + " | expected " + e + " | actual " + a); }
}

async function treeOf(...plugins: unknown[]): Promise<string[]> {
  const r = new KernelRegistries();
  activateBuiltins(r);
  const app = createApp(r);
  for (const p of plugins) activatePlugin(r, p as never);
  await app.dispatcher.handle("init 300 200");
  try {
    await app.dispatcher.handle('create box n1 10 10 80 40 "T"'); // 未装 box 插件时失败，忽略
  } catch {
    // 预期内的失败（bare 用例）
  }
  await app.dispatcher.handle("create rect plain 0 0 5 5");
  return app.dispatcher.handle("tree");
}

export async function runLabelTests(): Promise<void> {
  // 仅 box-label：复合行尾追加 (box)，普通 g 与叶子不标；基线行不受影响
  const only = await treeOf(pluginBoxLabel, pluginBox);
  expect("box line labelled", only[1], "\u251C\u2500\u2500 g#n1 (box)");
  expect("plain rect unlabelled", only[4], "\u2514\u2500\u2500 rect#plain         x=0 y=0 w=5 h=5");

  // 两标签并存（box 后注册 -> (box) 先、* 后；顺序 = 注册顺序）
  const both = await treeOf(pluginBoxLabel, pluginStar, pluginBox);
  expect("coexist box line", both[1], "\u251C\u2500\u2500 g#n1 (box) *");
  expect("coexist canvas", both[0], "svg (300x200) *");
  expect("coexist inner rect", both[2], "\u2502   \u251C\u2500\u2500 rect#n1-rect   x=10 y=10 w=80 h=40 fill=#4a90d9 *");

  // 未装 box 插件时，box-label 无输出（无复合图形）——缺省行为
  const bare = await treeOf(pluginBoxLabel);
  expect("no box plugin -> no label", bare[1], "\u2514\u2500\u2500 rect#plain  x=0 y=0 w=5 h=5");

  console.log("label suite: passed " + passed + ", failed " + failed);
  if (failures.length > 0) console.log(failures.join("\n"));
  if (failed > 0) process.exitCode = 1;
}
