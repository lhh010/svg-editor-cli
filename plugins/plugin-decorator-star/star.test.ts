import { KernelRegistries } from "../../src/kernel/Registries";
import { createApp, activateBuiltins, activatePlugin } from "../../src/host/Assembly";
import { CommandDispatcher } from "../../src/cli/CommandDispatcher";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import pluginStar from "./index";

/** modified-star 状态机独立测试：编辑 -> 保存 -> 再编辑 -> undo 回保存点，各分支覆盖。 */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function expect(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(label + " | expected " + e + " | actual " + a); }
}

async function run(d: CommandDispatcher, commands: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const c of commands) {
    try { out.push(...(await d.handle(c))); }
    catch (e) { out.push("error: " + (e instanceof Error ? e.message : String(e))); }
  }
  return out;
}

function starApp(): CommandDispatcher {
  const r = new KernelRegistries();
  activateBuiltins(r);
  const app = createApp(r);
  activatePlugin(r, pluginStar);
  return app.dispatcher;
}

export async function runStarTests(): Promise<void> {
  const tmp = path.join(os.tmpdir(), "star-p2-" + Date.now() + ".svg");
  const d = starApp();

  // 1. 从未保存：全部行标 *
  const fresh = await run(d, ["init 200 100", "create rect a 0 0 5 5", "create g g1", "create circle c 8 8 2 in g1", "tree"]);
  expect("unsaved canvas starred", fresh[4], "svg (200x100) *");
  expect("unsaved rect starred", fresh[5], "\u251C\u2500\u2500 rect#a        x=0 y=0 w=5 h=5 *");
  expect("unsaved group starred", fresh[6], "\u2514\u2500\u2500 g#g1 *");
  expect("unsaved nested starred", fresh[7], "    \u2514\u2500\u2500 circle#c  cx=8 cy=8 r=2 *");

  // 2. 保存后：* 消失
  const saved = await run(d, ["save " + tmp, "tree"]);
  expect("saved canvas clean", saved[1], "svg (200x100)");
  expect("saved rect clean", saved[2], "\u251C\u2500\u2500 rect#a        x=0 y=0 w=5 h=5");

  // 3. 再编辑：受影响子树 + 祖先 + 画布标 *（兄弟 c 不变不标）
  const edited = await run(d, ["move a 1 0", "tree"]);
  expect("edited canvas starred", edited[1], "svg (200x100) *");
  expect("edited rect starred", edited[2], "\u251C\u2500\u2500 rect#a        x=1 y=0 w=5 h=5 *");
  expect("ancestor starred", edited[3], "\u2514\u2500\u2500 g#g1");

  // 4. undo 回保存点：* 全部消失
  const undone = await run(d, ["undo", "tree"]);
  expect("undo canvas clean", undone[1], "svg (200x100)");
  expect("undo rect clean", undone[2], "\u251C\u2500\u2500 rect#a        x=0 y=0 w=5 h=5");

  // 5. redo：* 回来
  const redone = await run(d, ["redo", "tree"]);
  expect("redo starred", redone[2], "\u251C\u2500\u2500 rect#a        x=1 y=0 w=5 h=5 *");

  // 6. load（read）建立新保存点：无 *；随后编辑又标
  const d2 = starApp();
  const loaded = await run(d2, ["read " + tmp, "tree"]);
  expect("load clean", loaded[1], "svg (200x100)");
  const edited2 = await run(d2, ["set c fill red", "tree"]);
  expect("edit after load starred", edited2[4].includes("circle#c"), true);
  expect("edit after load star", edited2[4].includes("*"), true);

  // 7. 保存点之后新增图形：新行标 *（快照中无此 key）
  const d3 = starApp();
  const added = await run(d3, ["init 100 100", "create rect base 0 0 2 2", "save " + tmp + "2", "create rect late 5 5 2 2", "tree"]);
  expect("base clean after save", added[5], "\u251C\u2500\u2500 rect#base  x=0 y=0 w=2 h=2");
  expect("late addition starred", added[6], "\u2514\u2500\u2500 rect#late  x=5 y=5 w=2 h=2 *");

  fs.unlinkSync(tmp);
  fs.unlinkSync(tmp + "2");
  console.log("star suite: passed " + passed + ", failed " + failed);
  if (failures.length > 0) console.log(failures.join("\n"));
  if (failed > 0) process.exitCode = 1;
}
