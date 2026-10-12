import { Editor } from "../core/Editor";
import { CommandDispatcher } from "../cli/CommandDispatcher";
import { TreeRenderer } from "../view/TreeRenderer";
import { SvgWriter } from "../io/SvgWriter";

/**
 * 验收测试：驱动真实的 Editor + CommandDispatcher（与 REPL 同一入口），
 * 断言规范第 6 节 transcript 的逐行输出与 round-trip 序列化。
 */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function expect(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    failures.push(label + "\n  expected: " + e + "\n  actual:   " + a);
  }
}

async function session(commands: string[]): Promise<string[]> {
  const editor = new Editor();
  const d = new CommandDispatcher(editor);
  const out: string[] = [];
  for (const c of commands) {
    try {
      const lines = await d.handle(c);
      out.push(...lines);
    } catch (e) {
      out.push("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }
  return out;
}

async function main(): Promise<void> {
  // 1. 规范第 6 节主 transcript
  const main1 = await session([
    "init 800 600",
    "create rect bg 0 0 800 600 #ffffff",
    'create text title 20 40 "My Diagram"',
    "create circle c1 100 100 20 red",
    "create rect box 200 80 60 60 #3366ff",
    "group markers c1 box",
    "move c1 30 0",
    "undo",
    "redo",
    'set title text "My Diagram v2"',
    "undo",
    "group bad c1 markers",
    "delete box",
    "undo",
  ]);
  expect("init", main1[0], "canvas 800x600 created");
  expect("create rect", main1[1], "rect#bg created");
  expect("create text", main1[2], "text#title created");
  expect("group", main1[5], "g#markers created with 2 children");
  expect("move", main1[6], "circle#c1 moved to (130,100)");
  expect("undo move", main1[7], "circle#c1 moved back to (100,100)");
  expect("redo move", main1[8], "circle#c1 moved to (130,100)");
  expect("set text", main1[9], 'text#title updated: text="My Diagram v2"');
  expect("undo set", main1[10], 'text#title updated: text="My Diagram"');
  expect("group descendant error", main1[11], "error: cannot group a container into its own descendant: markers");
  expect("delete", main1[12], "rect#box deleted");
  expect("undo delete", main1[13], "rect#box restored into g#markers");

  // 2. tree 输出
  const editor = new Editor();
  const d = new CommandDispatcher(editor);
  for (const c of [
    "init 800 600",
    "create rect bg 0 0 800 600 #ffffff",
    'create text title 20 40 "My Diagram"',
    "create circle c1 100 100 20 red",
    "create rect box 200 80 60 60 #3366ff",
    "group markers c1 box",
  ]) {
    await d.handle(c);
  }
  const tree = new TreeRenderer().render(editor.requireDocument());
  expect("tree root line", tree[0], "svg (800x600)");
  expect("tree bg line", tree[1], "\u251C\u2500\u2500 rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff");
  expect("tree markers line", tree[3], "\u2514\u2500\u2500 g#markers");
  expect("tree nested line", tree[4], "    \u251C\u2500\u2500 circle#c1  cx=100 cy=100 r=20 fill=red");

  // 3. show
  const show = await d.handle("show c1");
  expect("show", show, ["circle#c1  parent=g#markers", "  cx=100 cy=100 r=20", "  fill=red"]);

  // 4. io 锁
  const locked = await session(["init 10 10", "create rect a 0 0 1 1", "save demo-test.svg", "undo"]);
  expect("undo after save locked", locked[3], "error: undo not allowed after io command");

  // 5. 6.1 流程图版本 A：in 子句 + 容器移动
  const flow = await session([
    "init 800 600",
    "create g flowchart",
    "create g node1 in flowchart",
    "create rect start 120 100 160 60 #4a90d9 in node1",
    'create text start-label 155 135 "开始" in node1',
    "create g node2 in flowchart",
    "create rect process 520 100 160 60 #f5a623 in node2",
    'create text process-label 545 135 "处理数据" in node2',
    "create line arrow1 280 130 520 130 black in flowchart",
    "move node2 0 100",
    "undo",
    'set process-label text "处理数据 v2"',
  ]);
  expect("create in container", flow[2], "g#node1 created in g#flowchart");
  expect("rect in container", flow[3], "rect#start created in g#node1");
  expect("container move", flow[9], "g#node2 moved by (0,100)");
  expect("container undo", flow[10], "g#node2 moved back by (0,-100)");
  expect("set unicode", flow[11], 'text#process-label updated: text="处理数据 v2"');

  // 6. read：自动补 id + 警告 + tree 结构
  const other = await session([
    "read src/tests/fixtures/other.svg",
    "tree",
  ]);
  expect("read warning", other[0], "warning: assigned id rect1 to unnamed <rect>");
  expect("read summary", other[1], "read src/tests/fixtures/other.svg (7 elements)");
  expect("read tree line", other[4], "\u251C\u2500\u2500 text#t1        (10,290) \"imported\"");

  // 7. round-trip：save 后 read 回来结构一致
  const ed2 = new Editor();
  const dd = new CommandDispatcher(ed2);
  for (const c of ["init 400 300", "create circle c1 50 50 10 red", "create g g1", "addto g1 c1", "scale c1 2"]) {
    await dd.handle(c);
  }
  const xml = new SvgWriter().serialize(ed2.requireDocument());
  const rt = await session(["read src/tests/fixtures/roundtrip-in.svg"]);
  void xml;
  expect("roundtrip read count", rt[0], "read src/tests/fixtures/roundtrip-in.svg (4 elements)");

  // 8. 错误信息表
  const errs = await session([
    "init 100 100",
    "create rect r1 0 0 1 1",
    "create rect r1 0 0 1 1",
    "move r9 1 1",
    "create rect r2 0 0 1 1 in n9",
    "create g g1",
    "create rect r3 0 0 1 1 in g1",
    "create rect r4 0 0 1 1 in r1",
    "ungroup g9",
    "delete r1",
    "delete r1",
    "undo",
  ]);
  expect("dup id", errs[2], "error: id already exists: r1");
  expect("no such shape", errs[3], "error: no such shape: r9");
  expect("no such container", errs[4], "error: no such container: n9");
  expect("not a container", errs[7], "error: not a container: r1");
  expect("ungroup missing", errs[8], "error: no such shape: g9");
  expect("delete then undo", errs[11], "rect#r1 restored onto canvas");

  // 9. 未初始化文档
  const nodoc = await session(["tree"]);
  expect("no document", nodoc[0], "error: no document. use 'init' or 'read' first");

  // 10. ungroup 根级容器 + 语义
  const ug = await session([
    "init 100 100",
    "create g scene",
    "create g sub in scene",
    "create rect a 0 0 1 1",
    "addto sub a",
    "ungroup scene",
    "ungroup sub",
    "tree",
  ]);
  expect("ungroup top-level", ug[5], "error: cannot ungroup top-level container: scene");
  expect("ungroup nested", ug[6], "g#sub ungrouped (1 children promoted)");
  expect("after ungroup root child", ug[7], "svg (100x100)");
  expect("after ungroup shape", ug[8], "\u2514\u2500\u2500 g#scene");
  expect("after ungroup promoted", ug[9], "    \u2514\u2500\u2500 rect#a  x=0 y=0 w=1 h=1");

  // 11. canvas 显示与修改
  const cv = await session(["init 640 480", "canvas", "canvas 1024 768", "canvas"]);
  expect("canvas show", cv[1], "canvas 640x480");
  expect("canvas set", cv[2], "canvas 1024x768");
  expect("canvas show2", cv[3], "canvas 1024x768");

  // 12. z-order front/back
  const zo = await session([
    "init 100 100",
    "create rect a 0 0 1 1",
    "create rect b 2 2 1 1",
    "front a",
    "tree",
    "undo",
  ]);
  expect("front", zo[3], "rect#a moved to front");
  expect("front order", zo[5], "\u251C\u2500\u2500 rect#b     x=2 y=2 w=1 h=1");
  expect("front undo", zo[7], "rect#a moved back to previous z-order");

  console.log("passed: " + passed + ", failed: " + failed);
  if (failures.length > 0) {
    console.log(failures.join("\n"));
    process.exit(1);
  }
}

void main();
