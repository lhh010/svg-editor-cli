import { Shape } from "../shapes/Shape";
import { Editor } from "../core/Editor";
import { SvgElementNode } from "../io/XmlParser";

/**
 * 四个扩展点的内核侧接口（Phase 2）。
 * 内核只依赖本文件中的抽象，不依赖任何插件实现。
 */

/** 读回时提供给 ShapeProvider 的解析上下文（由内核 SvgReader 实现）。 */
export interface ShapeParseContext {
  /** 递归解析一个子元素（含自动补 id、重复 id 检测与警告收集）；不可识别时返回 null。 */
  parseChild(node: SvgElementNode): Shape | null;
  /** 追加一条警告行（以 "warning: " 开头）。 */
  warn(message: string): void;
}

/** 扩展点 1：图形类型提供者（create 解析命令参数，parse 读回 SVG 节点）。 */
export interface ShapeProvider {
  /** 类型名（create <type> 的 type；box 插件注册 "box"）。 */
  readonly typeName: string;
  /** 对应的 SVG 标签名（默认同 typeName；复合类型如 box 声明为 "g"）。 */
  readonly tagName: string;
  /** 按命令参数构造图形；参数不合法时抛 CliError。 */
  create(id: string, params: string[]): Shape;
  /**
   * 读回时尝试认领一个元素节点；返回 null 表示不认领（交由下一个提供者）。
   * 询问顺序为注册的逆序：后注册者（更具体）先被询问。
   */
  parse(node: SvgElementNode, ctx: ShapeParseContext): Shape | null;
}

/** 扩展点 2：命令插件。命令名、help 文案由插件提供；内核经注册表分发。 */
export interface CommandContext {
  editor: Editor;
}

export interface CommandSpec {
  readonly name: string;
  readonly usage: string;
  readonly summary: string;
  /** 返回要打印的行；失败抛 CliError。只读命令不进入 undo 历史。 */
  execute(args: string[], ctx: CommandContext): string[];
}

/** 扩展点 3：树标签。为 tree 的行尾追加标签；状态封装在插件实例字段里。 */
export interface TreeRow {
  /** 行对应的图形；画布根行为 null。 */
  shape: Shape | null;
  /** 该行的子树序列化文本（容器含子孙），供 dirty 比较类标签使用。 */
  subtreeXml: string;
}

export interface TreeDecorator {
  /** 返回追加到行尾的标签（如 "*"、"（box)"），null 表示不加。 */
  decorate(row: TreeRow): string | null;
}

/** 扩展点 4：属性处理器。定义"在某类图形上设置某属性"的领域语义。 */

/** 处理器在每次成功修改一个属性前调用，登记撤销记录；内核据此回滚与 undo。 */
export interface EditRecorder {
  record(shape: Shape, attr: string, oldValue: string | null): void;
}

export interface AttributeApplyResult {
  /** 命令成功回显文本。 */
  message: string;
  /** 撤销回显文本；缺省用内核默认格式。 */
  undoMessage?: string;
}

export interface AttributeHandler {
  /** 是否负责该图形及属性；不得修改文档状态。 */
  handles(shape: Shape, attr: string): boolean;
  /** 执行修改；所有修改必须经 recorder 登记，部分失败抛错由内核回滚。 */
  apply(shape: Shape, attr: string, value: string, recorder: EditRecorder): AttributeApplyResult;
}

/** 插件激活时拿到的上下文：注册扩展 + 访问内核公开能力。 */
export interface PluginContext {
  editor: Editor;
  registerShape(name: string, provider: ShapeProvider): void;
  registerCommand(spec: CommandSpec): void;
  registerDecorator(name: string, decorator: TreeDecorator): void;
  registerAttributeHandler(name: string, handler: AttributeHandler): void;
}

/** 插件清单（package.json 的 contributes 段）。 */
export interface PluginManifest {
  name: string;
  contributes?: {
    shapes?: string[];
    commands?: string[];
    decorators?: string[];
    attributes?: string[];
  };
}
