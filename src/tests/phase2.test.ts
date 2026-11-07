import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { KernelRegistries } from "../kernel/Registries";
import { createApp, activateBuiltins, activatePlugin, App } from "../host/Assembly";
import { PluginLoader } from "../host/PluginLoader";
import { CommandDispatcher } from "../cli/CommandDispatcher";
import { DirCommand, InMemoryDirectoryAccess } from "../../plugins/plugin-cmd-dir";
import pluginStats from "../../plugins/plugin-cmd-stats";
import pluginDir from "../../plugins/plugin-cmd-dir";

/** Phase 2 插件与装配测试。 */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function expect(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else {
    failed++;
    failures.push(label + " | expected " + e + " | actual " + a);
  }
}

function appWithPlugins(...plugins: unknown[]): { app: App; dispatcher: CommandDispatcher } {
  const registries = new KernelRegistries();
  activateBuiltins(registries);
  const app = createApp(registries);
  for (const p of plugins) activatePlugin(registries, p as never);
  return { app, dispatcher: app.dispatcher };
}

async function run(dispatcher: CommandDispatcher, commands: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const c of commands) {
    try {
      out.push(...(await dispatcher.handle(c)));
    } catch (e) {
      out.push("error: " + (e instanceof Error ? e.message : String(e)));
    }
  }
  return out;
}

export async function runPhase2Tests(): Promise<void> {
  await testStats();
  await testDir();
  await testLoader();
  await testAssemblyConsistency();
  console.log("phase2 suite: passed " + passed + ", failed " + failed);
  if (failures.length > 0) console.log(failures.join("\n"));
}
async function testStats(): Promise<void> {
  const { dispatcher: d1 } = appWithPlugins(pluginStats, pluginDir);
  const stats = await run(d1, [
    "init 400 300",
    "create rect a 0 0 1 1",
    "create circle c 5 5 2",
    "create rect b 9 9 1 1",
    "create text t 1 1 x",
    "create g g1",
    "create text t2 2 2 y in g1",
    "stats",
  ]);
  expect("stats line", stats[7], "rect: 2  circle: 1  text: 2  (total 5, containers 1)");
  const statsEmpty = await run(appWithPlugins(pluginStats).dispatcher, ["init 10 10", "stats"]);
  expect("stats empty", statsEmpty[1], "(total 0, containers 0)");
  const statsUndo = await run(appWithPlugins(pluginStats).dispatcher, [
    "init 10 10", "create rect a 0 0 1 1", "stats", "undo", "stats",
  ]);
  // stats 本身不是 undo 单元：undo 撤销的是它前面的 create
  expect("stats not an undo unit", statsUndo[3], "rect#a removed");
  expect("stats after undo", statsUndo[4], "(total 0, containers 0)");
  const withHelp = await run(d1, ["help"]);
  expect("help lists stats", withHelp.some((l) => l.includes("stats") && l.includes("count shapes")), true);
  const bareReg = new KernelRegistries();
  activateBuiltins(bareReg);
  const noStats = await run(createApp(bareReg).dispatcher, ["stats"]);
  expect("stats unknown when unloaded", noStats[0], "error: unknown command: stats");
}

async function testDir(): Promise<void> {
  const dirCmd = new DirCommand(new InMemoryDirectoryAccess([
    { name: "demo.svg", isDirectory: false },
    { name: "docs", isDirectory: true },
    { name: "plugins", isDirectory: true },
    { name: "package.json", isDirectory: false },
  ]));
  expect(
    "dir double mixed+sorted",
    dirCmd.execute([], null as never),
    ["[DIR]  docs", "[DIR]  plugins", "[FILE]  demo.svg", "[FILE]  package.json"]
  );
  const dirHidden = new DirCommand(new InMemoryDirectoryAccess([
    { name: ".git", isDirectory: true },
    { name: ".env", isDirectory: false },
    { name: "a.txt", isDirectory: false },
  ]));
  expect("dir hidden included", dirHidden.execute([], null as never), ["[DIR]  .git", "[FILE]  .env", "[FILE]  a.txt"]);
  const dirEmpty = new DirCommand(new InMemoryDirectoryAccess([]));
  expect("dir empty", dirEmpty.execute([], null as never), ["(empty directory)"]);
  const dirFail = new DirCommand(new InMemoryDirectoryAccess(new Error("EACCES")));
  let caught = "";
  try { dirFail.execute([], null as never); } catch (e) { caught = e instanceof Error ? e.message : String(e); }
  expect("dir throws", caught, "cannot read directory: " + process.cwd());

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dirtest-"));
  fs.mkdirSync(path.join(tmp, "zdir"));
  fs.mkdirSync(path.join(tmp, "adir"));
  fs.writeFileSync(path.join(tmp, "b.txt"), "x");
  fs.writeFileSync(path.join(tmp, "a.txt"), "x");
  const prevCwd = process.cwd();
  process.chdir(tmp);
  try {
    expect("dir real fs", new DirCommand().execute([], null as never), ["[DIR]  adir", "[DIR]  zdir", "[FILE]  a.txt", "[FILE]  b.txt"]);
    const { dispatcher: dNoDoc } = appWithPlugins(pluginDir);
    const outNoDoc = await run(dNoDoc, ["dir"]);
    expect("dir without document", outNoDoc.slice(0, 2), ["[DIR]  adir", "[DIR]  zdir"]);
    const { dispatcher: dHist } = appWithPlugins(pluginDir);
    const hist = await run(dHist, ["init 50 50", "create rect a 0 0 1 1", "dir", "undo", "tree"]);
    // dir 输出 4 行（2 目录 + 2 文件），undo 仍可撤销 create 且未被 io 锁
    expect("dir keeps undo history", hist[6], "rect#a removed");
    expect("dir does not lock undo", hist[7].startsWith("svg (50x50)"), true);
  } finally {
    process.chdir(prevCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
async function testLoader(): Promise<void> {
  const rootCfg = "loader-test.config.json";
  const loadWith = (json: string): { lines: string[]; registries: KernelRegistries } => {
    fs.writeFileSync(rootCfg, json);
    const registries = new KernelRegistries();
    activateBuiltins(registries);
    createApp(registries);
    const lines = new PluginLoader(registries).load(rootCfg);
    return { lines, registries };
  };

  const l1 = loadWith(JSON.stringify({ plugins: [{ module: "./test-fixtures/plugins/definitely-missing" }] }));
  expect("loader not found", l1.lines, ["error: plugin not found: ./test-fixtures/plugins/definitely-missing"]);

  const l2 = loadWith(JSON.stringify({ plugins: [{ module: "./test-fixtures/plugins/no-default" }] }));
  expect("loader no default export", l2.lines, ["error: plugin has no default export: ./test-fixtures/plugins/no-default"]);

  const l3 = loadWith(JSON.stringify({ plugins: [{ module: "./test-fixtures/plugins/mismatch" }] }));
  expect("loader manifest mismatch", l3.lines, ["error: plugin manifest mismatch: fx-mismatch (declared: shapes=[], commands=[], decorators=[other-name], attributes=[], registered: shapes=[], commands=[], decorators=[declared-name], attributes=[])"]);

  const l4 = loadWith(JSON.stringify({ plugins: [{ module: "./test-fixtures/plugins/throws" }] }));
  expect("loader activate throws", l4.lines, ["error: plugin failed to activate: fx-throws (boom during activate)"]);

  const l5 = loadWith(JSON.stringify({ plugins: [{ module: "./test-fixtures/plugins/partial-and-dup" }] }));
  expect("loader duplicate", l5.lines, ["error: duplicate registration: commands/extra-two"]);
  const app5 = createApp(l5.registries);
  const out5 = await run(app5.dispatcher, ["extra-one", "extra-two"]);
  expect("rollback removes partial registrations", out5, ["error: unknown command: extra-one", "error: unknown command: extra-two"]);

  const l6 = loadWith(JSON.stringify({ plugins: [
    { module: "./dist/plugins/plugin-cmd-stats" },
    { module: "./test-fixtures/plugins/dup-stats" },
  ] }));
  expect("loader duplicate across plugins", l6.lines.includes("error: duplicate registration: commands/stats"), true);
  const out6 = await run(createApp(l6.registries).dispatcher, ["init 5 5", "stats"]);
  expect("earlier plugin survives", out6[1], "(total 0, containers 0)");

  for (const bad of ["{ not json", "{}", '{"plugins": "x"}', '{"plugins": [{}]}']) {
    const lb = loadWith(bad);
    expect("invalid config: " + bad.slice(0, 12), lb.lines, ["error: invalid plugin config"]);
  }
  fs.unlinkSync(rootCfg);
}

async function testAssemblyConsistency(): Promise<void> {
  const session = [
    "init 300 200",
    "create rect a 0 0 10 10 red",
    "create g g1",
    "addto g1 a",
    'create box n1 20 20 80 40 "节点"',
    "group all g1 n1",
    "move all 5 5",
    "undo",
    "set n1 fill #f5a623",
    'set n1 label "节点 v2"',
    "stats",
    "tree",
    "help",
  ];
  const regA = new KernelRegistries();
  activateBuiltins(regA);
  const appA = createApp(regA);
  activatePlugin(regA, pluginStats);
  activatePlugin(regA, pluginDir);
  const outA = (await run(appA.dispatcher, session)).join("\n");

  const regB = new KernelRegistries();
  activateBuiltins(regB);
  const appB = createApp(regB);
  const loadLines = new PluginLoader(regB).load("plugins.config.json");
  expect("way B loads clean", loadLines, []);
  const outB = (await run(appB.dispatcher, session)).join("\n");
  expect("A/B byte-identical", outA, outB);
}
