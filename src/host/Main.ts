import { KernelRegistries } from "../kernel/Registries";
import { Repl } from "../cli/Repl";
import { createApp, activateBuiltins, activatePlugin, App, PluginDefinition } from "./Assembly";
import { PluginLoader } from "./PluginLoader";
import pluginStats from "../../plugins/plugin-cmd-stats";
import pluginDir from "../../plugins/plugin-cmd-dir";
import pluginShapeBox from "../../plugins/plugin-shape-box";

/**
 * CLI 入口。三种启动形态：
 *   （无参数）  方式 A：代码装配——内置 + 组合根 import 的可选插件
 *   --bare     仅内置能力（Phase 1 基线，字节级一致，用于兼容性对照）
 *   --config p 方式 B：配置装配——按 p（默认 plugins.config.json）加载插件
 */

/** 方式 A 装配的可选插件清单（接入新插件：import 后加入此数组，仅本装配文件改动）。 */
function wiredPlugins(): PluginDefinition[] {
  return [
    pluginStats,
    pluginDir,
    pluginShapeBox,
    // Phase 2 后续节点逐步加入：decorator-star / decorator-box-label
  ];
}

async function main(): Promise<void> {
  console.log("svg-editor 0.1 \u2014 type 'help' for commands");
  console.log();
  const args = process.argv.slice(2);
  const registries = new KernelRegistries();
  activateBuiltins(registries);
  // 先建 app：dispatcher 注入保留命令名后，插件命令的重名校验才生效
  const app: App = createApp(registries);

  if (args.includes("--bare")) {
    await run(app);
    return;
  }
  const configIdx = args.indexOf("--config");
  if (configIdx >= 0) {
    const configPath = args[configIdx + 1] ?? "plugins.config.json";
    for (const line of new PluginLoader(registries).load(configPath)) console.log(line);
    await run(app);
    return;
  }
  for (const plugin of wiredPlugins()) {
    activatePlugin(registries, plugin);
  }
  await run(app);
}

async function run(app: App): Promise<void> {
  await new Repl(app.dispatcher).run();
}

void main();
