import * as fs from "node:fs";
import * as path from "node:path";
import { KernelRegistries, AssemblyError, DuplicateRegistrationError } from "../kernel/Registries";
import { PluginDefinition, activatePlugin } from "./Assembly";

/**
 * 配置装配（方式 B）的插件加载器——位于装配一侧，不属于内核。
 * 按字符串模块名解析加载：不硬编码任何具体插件的导入、名称映射或分支；
 * 接入新插件只须在 plugins.config.json 增加条目。
 *
 * 模块解析：相对路径以配置文件目录为基准；tsconfig 将 plugins/ 编译到 dist/plugins/，
 * 因此依次尝试 [配置目录、配置目录/dist] 与 [原名、原名.js、原名/index.js] 的组合。
 * options 字段整体作为第二个参数传给 activate（本仓库插件未使用，契约保留）。
 */
export class PluginLoader {
  constructor(private readonly registries: KernelRegistries) {}

  /** 返回加载中打印的 error: 行（不抛出；任何失败后继续启动）。 */
  load(configPath: string): string[] {
    const errors: string[] = [];
    let raw: string;
    try {
      raw = fs.readFileSync(configPath, "utf-8");
    } catch {
      errors.push("error: invalid plugin config");
      return errors;
    }
    let config: unknown;
    try {
      config = JSON.parse(raw);
    } catch {
      errors.push("error: invalid plugin config");
      return errors;
    }
    const entries = validateConfig(config);
    if (entries === null) {
      errors.push("error: invalid plugin config");
      return errors;
    }
    const baseDir = path.dirname(path.resolve(configPath));
    for (const entry of entries) {
      if (entry.enabled === false) continue;
      const failure = this.loadOne(baseDir, entry.module, entry.options);
      if (failure !== null) errors.push(failure);
    }
    return errors;
  }

  private loadOne(baseDir: string, moduleRef: string, options: unknown): string | null {
    const resolved = this.resolveModule(baseDir, moduleRef);
    if (resolved === null) return "error: plugin not found: " + moduleRef;
    let mod: Record<string, unknown>;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mod = require(resolved) as Record<string, unknown>;
    } catch (e) {
      // 模块存在但求值失败（或其依赖失败）按"插件激活失败"处理，不误报 not found
      return "error: plugin failed to activate: " + moduleRef + " (" + describeError(e) + ")";
    }
    const plugin = mod.default;
    if (plugin === undefined || typeof plugin !== "object" || plugin === null) {
      return "error: plugin has no default export: " + moduleRef;
    }
    const manifest = this.readManifest(resolved, plugin as PluginDefinition);
    try {
      const def = plugin as PluginDefinition;
      this.registries.activate(
        { name: manifest.name, contributes: manifest.contributes },
        (ctx) => {
          def.activate(ctx, options);
        }
      );
      return null;
    } catch (e) {
      if (e instanceof DuplicateRegistrationError) {
        return "error: " + e.message;
      }
      if (e instanceof AssemblyError) {
        return "error: " + e.message;
      }
      return "error: plugin failed to activate: " + manifest.name + " (" + describeError(e) + ")";
    }
  }

  /** 依次尝试 [baseDir, baseDir/dist] × [ref, ref.js, ref/index.js]。 */
  private resolveModule(baseDir: string, ref: string): string | null {
    if (!ref.startsWith(".")) {
      // 包名：交给 Node 的模块解析（本仓库未使用包名形态）
      try {
        return require.resolve(ref, { paths: [baseDir] });
      } catch {
        return null;
      }
    }
    const candidates: string[] = [];
    for (const root of [baseDir, path.join(baseDir, "dist")]) {
      candidates.push(path.resolve(root, ref));
      candidates.push(path.resolve(root, ref) + ".js");
      candidates.push(path.resolve(path.join(root, ref), "index.js"));
    }
    for (const c of candidates) {
      try {
        return require.resolve(c);
      } catch {
        continue;
      }
    }
    return null;
  }

  /** manifest 取自插件包目录的 package.json（contributes 段）；缺失时回退插件对象自带声明。 */
  private readManifest(resolved: string, plugin: PluginDefinition): { name: string; contributes?: PluginManifestLike } {
    void plugin;
    const dir = path.dirname(resolved);
    const pkgPath = path.join(dir, "package.json");
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string; contributes?: PluginManifestLike };
      return { name: pkg.name ?? path.basename(dir), contributes: pkg.contributes };
    } catch {
      return { name: plugin.name, contributes: plugin.contributes };
    }
  }
}

type PluginManifestLike = NonNullable<PluginDefinition["contributes"]>;

interface ConfigEntry {
  module: string;
  options?: unknown;
  enabled?: boolean;
}

function validateConfig(config: unknown): ConfigEntry[] | null {
  if (typeof config !== "object" || config === null) return null;
  const plugins = (config as { plugins?: unknown }).plugins;
  if (!Array.isArray(plugins)) return null;
  const out: ConfigEntry[] = [];
  for (const p of plugins) {
    if (typeof p !== "object" || p === null) return null;
    const m = (p as { module?: unknown }).module;
    if (typeof m !== "string" || m.length === 0) return null;
    out.push(p as ConfigEntry);
  }
  return out;
}

function describeError(e: unknown): string {
  return e instanceof Error ? e.message.split("\n")[0] : String(e);
}

// 保留 activatePlugin 引用（外部装配亦可用）
void activatePlugin;
