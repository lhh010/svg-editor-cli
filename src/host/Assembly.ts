import { KernelRegistries, AssemblyError } from "../kernel/Registries";
import { PluginManifest, PluginContext } from "../kernel/ExtensionPoints";
import { Editor } from "../core/Editor";
import { CommandDispatcher } from "../cli/CommandDispatcher";
import { BuiltinShapeProviders } from "../builtin/BuiltinShapeProviders";

/**
 * 装配处（组合根）。三种启动形态共用同一条插件激活路径（KernelRegistries.activate）：
 * - bare：仅内置能力（Phase 1 行为，字节级一致）
 * - 代码装配（方式 A）：组合根 import 插件并 activate
 * - 配置装配（方式 B）：PluginLoader 按 plugins.config.json 解析加载
 */

/** 插件对象的公共形态（各插件包的 default export）。 */
export interface PluginDefinition {
  name: string;
  activate(ctx: PluginContext, options?: unknown): void;
  contributes?: PluginManifest["contributes"];
}

export interface App {
  editor: Editor;
  dispatcher: CommandDispatcher;
}

export function createApp(registries: KernelRegistries): App {
  const editor = new Editor(registries);
  const dispatcher = new CommandDispatcher(editor);
  return { editor, dispatcher };
}

/** 内置图形以注册机制装配（manifest 声明与注册一致，走同一条校验路径）。 */
export function activateBuiltins(registries: KernelRegistries): void {
  registries.activate(
    { name: "builtin-shapes", contributes: { shapes: BuiltinShapeProviders.providers.map((p) => p.typeName) } },
    (ctx) => {
      for (const p of BuiltinShapeProviders.providers) ctx.registerShape(p.typeName, p);
    }
  );
}

/** 代码装配（方式 A）激活一个插件对象；与配置装配共用 KernelRegistries.activate。 */
export function activatePlugin(registries: KernelRegistries, plugin: PluginDefinition): void {
  registries.activate(
    { name: plugin.name, contributes: plugin.contributes },
    (ctx) => plugin.activate(ctx)
  );
}

export { AssemblyError };
