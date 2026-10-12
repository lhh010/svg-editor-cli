/**
 * Command 模式：一条编辑命令 = 一个 undo 单元。
 * execute() 返回成功回显文本；失败抛 CliError（状态不变，不进入历史）。
 * undo() 返回撤销回显文本并完整还原现场。
 */
export interface Command {
  execute(): string;
  undo(): string;
}
