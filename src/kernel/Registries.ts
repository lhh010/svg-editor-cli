import {
  ShapeProvider,
  CommandSpec,
  TreeDecorator,
  AttributeHandler,
  PluginContext,
  PluginManifest,
} from "./ExtensionPoints";
import { Shape } from "../shapes/Shape";
import { Editor } from "../core/Editor";
import { CliError } from "../errors/CliError";

/**
 * 四个注册表 + 统一的插件激活/校验/回滚路径。
 * 代码装配（方式 A）与配置装配（方式 B）都经过 activate()——同一条注册与校验路径。
 */
export class KernelRegistries {
  readonly shapes = new ShapeRegistry();
  readonly commands = new CommandRegistry();
  readonly decorators = new DecoratorRegistry();
  readonly attributes = new AttributeRegistry();
  /** 由装配处创建 Editor 时回填（PluginContext 经此暴露内核门面）。 */
  editorRef!: import("../core/Editor").Editor;

  /** 与内置命令名冲突的保留名（提交校验用），由装配处注入。 */
  reservedCommandNames: ReadonlySet<string> = new Set<string>();

  /**
   * 激活一个插件：在暂存 scope 上执行 activate，成功后一次性提交。
   * 清单不一致 / 重名 / activate 抛错 → 撤销全部暂存注册并抛 AssemblyError（已成功的其他插件不受影响）。
   */
  activate(manifest: PluginManifest, activate: (ctx: PluginContext) => void): void {
    const scope = new PluginScope(this, manifest);
    try {
      activate(scope);
      scope.commit();
    } catch (e) {
      scope.rollback();
      throw e;
    }
  }
}

export class AssemblyError extends Error {}

export class ShapeRegistry {
  private readonly byName = new Map<string, ShapeProvider>();

  register(name: string, provider: ShapeProvider): void {
    if (name.length === 0) throw new AssemblyError("shape provider must have a name");
    if (this.byName.has(name)) throw new DuplicateRegistrationError("shapes", name);
    this.byName.set(name, provider);
  }

  has(type: string): boolean {
    return this.byName.has(type);
  }

  create(type: string, id: string, params: string[]): Shape {
    const p = this.byName.get(type);
    if (p === undefined) {
      throw new CliError("unknown shape type: " + type + " (is the plugin loaded?)");
    }
    return p.create(id, params);
  }

  /** 读回候选提供者：按注册逆序（后注册的更具体者先被询问）。 */
  providersFor(tag: string): ShapeProvider[] {
    const out: ShapeProvider[] = [];
    for (const p of this.byName.values()) {
      if (p.tagName === tag) out.unshift(p);
    }
    return out;
  }
}

export class CommandRegistry {
  private readonly byName = new Map<string, CommandSpec>();

  register(spec: CommandSpec): void {
    if (this.byName.has(spec.name)) throw new DuplicateRegistrationError("commands", spec.name);
    this.byName.set(spec.name, spec);
  }

  find(name: string): CommandSpec | undefined {
    return this.byName.get(name);
  }

  all(): CommandSpec[] {
    return [...this.byName.values()];
  }

  names(): string[] {
    return [...this.byName.keys()];
  }
}

export class DecoratorRegistry {
  private readonly list: TreeDecorator[] = [];

  register(name: string, decorator: TreeDecorator): void {
    if (name.length === 0) throw new AssemblyError("decorator must have a name");
    this.list.push(decorator);
  }

  all(): readonly TreeDecorator[] {
    return this.list;
  }
}

export class AttributeRegistry {
  private readonly handlers: Array<{ name: string; handler: AttributeHandler }> = [];

  register(name: string, handler: AttributeHandler): void {
    if (name.length === 0) throw new AssemblyError("attribute handler must have a name");
    this.handlers.push({ name, handler });
  }

  /** 命中规则（ADR-1）：按注册顺序取第一个 handles() 为真者。 */
  find(shape: Shape, attr: string): AttributeHandler | null {
    for (const { handler } of this.handlers) {
      if (handler.handles(shape, attr)) return handler;
    }
    return null;
  }
}

export class DuplicateRegistrationError extends AssemblyError {
  constructor(readonly category: string, readonly name: string) {
    super("duplicate registration: " + category + "/" + name);
  }
}

/** 激活期间的暂存 scope：登记注册项，commit 时做清单一致性与重名校验。 */
class PluginScope implements PluginContext {
  private staged = false;
  private readonly shapes: Array<[string, ShapeProvider]> = [];
  private readonly commands: CommandSpec[] = [];
  private readonly decorators: Array<[string, TreeDecorator]> = [];
  private readonly attributes: Array<[string, AttributeHandler]> = [];

  constructor(
    private readonly owner: KernelRegistries,
    private readonly manifest: PluginManifest
  ) {}

  get editor(): Editor {
    return this.owner.editorRef;
  }

  registerShape(name: string, provider: ShapeProvider): void {
    this.assertActive();
    this.shapes.push([name, provider]);
  }

  registerCommand(spec: CommandSpec): void {
    this.assertActive();
    this.commands.push(spec);
  }

  registerDecorator(name: string, decorator: TreeDecorator): void {
    this.assertActive();
    this.decorators.push([name, decorator]);
  }

  registerAttributeHandler(name: string, handler: AttributeHandler): void {
    this.assertActive();
    this.attributes.push([name, handler]);
  }

  private assertActive(): void {
    if (this.staged) throw new AssemblyError("plugin context already committed");
  }

  commit(): void {
    this.checkDuplicates();
    this.checkManifest();
    for (const [n, p] of this.shapes) this.owner.shapes.register(n, p);
    for (const c of this.commands) this.owner.commands.register(c);
    for (const [n, d] of this.decorators) this.owner.decorators.register(n, d);
    for (const [n, h] of this.attributes) this.owner.attributes.register(n, h);
    this.staged = true;
  }

  rollback(): void {
    this.shapes.length = 0;
    this.commands.length = 0;
    this.decorators.length = 0;
    this.attributes.length = 0;
    this.staged = true;
  }

  private checkDuplicates(): void {
    const seen = new Set<string>();
    for (const [n] of this.shapes) {
      if (seen.has("shapes/" + n)) throw new DuplicateRegistrationError("shapes", n);
      seen.add("shapes/" + n);
    }
    for (const c of this.commands) {
      if (seen.has("commands/" + c.name)) throw new DuplicateRegistrationError("commands", c.name);
      if (this.owner.reservedCommandNames.has(c.name)) {
        throw new DuplicateRegistrationError("commands", c.name);
      }
      seen.add("commands/" + c.name);
    }
    for (const [n] of this.decorators) {
      if (seen.has("decorators/" + n)) throw new DuplicateRegistrationError("decorators", n);
      seen.add("decorators/" + n);
    }
    for (const [n] of this.attributes) {
      if (seen.has("attributes/" + n)) throw new DuplicateRegistrationError("attributes", n);
      seen.add("attributes/" + n);
    }
  }

  private checkManifest(): void {
    const c = this.manifest.contributes;
    if (c === undefined) return;
    const declared = new Map<string, string[]>([
      ["shapes", c.shapes ?? []],
      ["commands", c.commands ?? []],
      ["decorators", c.decorators ?? []],
      ["attributes", c.attributes ?? []],
    ]);
    const registered = new Map<string, string[]>([
      ["shapes", this.shapes.map(([n]) => n)],
      ["commands", this.commands.map((s) => s.name)],
      ["decorators", this.decorators.map(([n]) => n)],
      ["attributes", this.attributes.map(([n]) => n)],
    ]);
    let mismatch = false;
    const parts: string[] = [];
    for (const cat of ["shapes", "commands", "decorators", "attributes"]) {
      const d = normalize(declared.get(cat)!);
      const r = normalize(registered.get(cat)!);
      if (d.join(",") !== r.join(",")) mismatch = true;
      parts.push(cat + "=[" + r.join(",") + "]");
    }
    if (mismatch) {
      throw new AssemblyError(
        "plugin manifest mismatch: " + this.manifest.name + " (declared: " + describe(declared) + ", registered: " + parts.join(", ") + ")"
      );
    }
  }
}

function normalize(xs: string[]): string[] {
  return [...new Set(xs)].sort();
}

function describe(declared: Map<string, string[]>): string {
  return ["shapes", "commands", "decorators", "attributes"]
    .map((cat) => cat + "=[" + normalize(declared.get(cat)!).join(",") + "]")
    .join(", ");
}

/** 插件事件总线：内核公开的文档事件（供标签等插件订阅；内核不依赖订阅者）。 */
export type DocumentEvent =
  | { type: "init" }
  | { type: "load"; path: string }
  | { type: "save"; path: string };

export class EventBus {
  private readonly listeners: Array<(e: DocumentEvent) => void> = [];

  on(listener: (e: DocumentEvent) => void): void {
    this.listeners.push(listener);
  }

  emit(e: DocumentEvent): void {
    for (const l of this.listeners) l(e);
  }
}
