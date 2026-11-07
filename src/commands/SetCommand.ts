import { Command } from "./Command";
import { SvgDocument } from "../document/SvgDocument";
import { Shape } from "../shapes/Shape";
import { mustFind } from "./Resolve";
import { KernelRegistries } from "../kernel/Registries";
import { EditRecorder, AttributeApplyResult } from "../kernel/ExtensionPoints";
import { CliError } from "../errors/CliError";

interface RecordedEdit {
  shape: Shape;
  attr: string;
  oldValue: string | null;
}

/**
 * set 命令：优先走 AttributeHandler 扩展点（领域语义，如 box 的 fill/label），
 * 无处理器命中时回落到 Phase 1 的白名单规则（shape.setAttribute）。
 * 两种路径都是同一个 undo 单元；处理器部分失败时按记录回滚，历史不变。
 */
export class SetCommand implements Command {
  private shape: Shape | null = null;
  private oldValue: string | null = null;
  private handlerEdits: RecordedEdit[] | null = null;
  private handlerUndoMessage: string | null = null;

  constructor(
    private readonly doc: SvgDocument,
    private readonly registries: KernelRegistries,
    private readonly id: string,
    private readonly attr: string,
    private readonly value: string
  ) {}

  execute(): string {
    const shape = mustFind(this.doc, this.id);
    const handler = this.registries.attributes.find(shape, this.attr);
    if (handler !== null) {
      const edits: RecordedEdit[] = [];
      const recorder: EditRecorder = {
        record: (s, attr, oldValue) => edits.push({ shape: s, attr, oldValue }),
      };
      let result: AttributeApplyResult;
      try {
        result = handler.apply(shape, this.attr, this.value, recorder);
      } catch (e) {
        this.rollback(edits);
        throw new CliError("attribute handler failed: " + (e instanceof Error ? e.message : String(e)));
      }
      this.shape = shape;
      this.handlerEdits = edits;
      this.handlerUndoMessage = result.undoMessage ?? null;
      return result.message;
    }
    this.oldValue = shape.setAttribute(this.attr, this.value); // 白名单外抛 InvalidAttributeError
    this.shape = shape;
    return shape.echoLabel() + " updated: " + this.describe(this.value);
  }

  undo(): string {
    const shape = this.shape!;
    if (this.handlerEdits !== null) {
      this.rollback([...this.handlerEdits].reverse());
      const msg = this.handlerUndoMessage;
      return msg !== null ? msg : shape.echoLabel() + " updated: " + this.describe(this.oldValue ?? "");
    }
    if (this.oldValue === null) {
      shape.clearAttribute(this.attr);
      return shape.echoLabel() + " updated: " + this.attr + "= (default)";
    }
    shape.setAttribute(this.attr, this.oldValue);
    return shape.echoLabel() + " updated: " + this.describe(this.oldValue);
  }

  private rollback(edits: RecordedEdit[]): void {
    for (const e of [...edits].reverse()) {
      if (e.oldValue === null) e.shape.clearAttribute(e.attr);
      else e.shape.setAttribute(e.attr, e.oldValue);
    }
  }

  private describe(v: string): string {
    return this.attr === "text" ? this.attr + '="' + v + '"' : this.attr + "=" + v;
  }
}
