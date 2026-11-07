import * as vscode from "vscode";
import { buildOutline } from "./outline";

/**
 * VSCode 扩展入口：SVG 文件标记（Explorer 徽标 "[]"）与 SVG 大纲（原生 Outline）。
 * VSCode 与插件的职责划分、FileDecorationProvider 与 Decorator/Adapter 模式的对应
 * 关系见仓库 doc/README.md 第一部分 A.3。
 */
export function activate(context: vscode.ExtensionContext): void {
  // 激活指示：状态栏显示 "SVG Tools OK"，用于肉眼确认扩展确实已激活
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = "SVG Tools OK";
  status.tooltip = "svg-svg-tools 扩展已激活";
  status.show();
  context.subscriptions.push(status);

  // A.1 文件标记：注册 FileDecorationProvider，由 VSCode 在渲染 Explorer 时回调
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgFileDecorationProvider())
  );
  // A.2 大纲：注册 DocumentSymbolProvider，由 VSCode 在大纲视图需要时回调。
  // 选择器覆盖各种语言关联情形（xml / svg 语言、纯 pattern、file scheme）。
  const selector: vscode.DocumentSelector = [
    { language: "svg" },
    { language: "xml", pattern: "**/*.svg" },
    { pattern: "**/*.svg" },
    { scheme: "file", pattern: "**/*.svg" },
  ];
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(selector, new SvgOutlineProvider())
  );
  // 手动诊断命令：不经过大纲视图，直接对活动编辑器跑解析，用信息框显示结果
  context.subscriptions.push(
    vscode.commands.registerCommand("svgTools.showOutline", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined) {
        void vscode.window.showInformationMessage("SVG Tools: 没有打开的编辑器");
        return;
      }
      const nodes = buildOutline(editor.document.getText());
      const names: string[] = [];
      const walk = (ns: typeof nodes, depth: number): void => {
        for (const n of ns) {
          names.push("  ".repeat(depth) + n.name);
          walk(n.children, depth + 1);
        }
      };
      walk(nodes, 0);
      void vscode.window.showInformationMessage(
        "SVG Tools 大纲（" + editor.document.fileName + "，" + nodes.length + " 个根节点）：\n" + (names.length > 0 ? names.join("\n") : "（解析结果为空）")
      );
    })
  );
  console.log("[svg-tools] activated; symbol provider registered for", JSON.stringify(selector));
}

/** A.1：只对 .svg 文件返回 "[]" 徽标；不修改文件名与内容。 */
class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme === "file" && uri.path.toLowerCase().endsWith(".svg")) {
      return new vscode.FileDecoration("[]");
    }
    return undefined;
  }
}

/** A.2：解析文档文本 -> 大纲树；点击节点定位到开始标签；编辑后 VSCode 重新回调。 */
class SvgOutlineProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.DocumentSymbol[] {
    console.log("[svg-tools] provideDocumentSymbols called for", document.fileName, "language =", document.languageId);
    const nodes = buildOutline(document.getText());
    return nodes.map((n) => this.toSymbol(n));
  }

  private toSymbol(n: import("./outline").OutlineNode): vscode.DocumentSymbol {
    const range = new vscode.Range(n.startLine, n.startChar, n.endLine, n.endChar);
    const sel = new vscode.Range(n.selStartLine, n.selStartChar, n.selEndLine, n.selEndChar);
    const kind = n.container ? vscode.SymbolKind.Struct : vscode.SymbolKind.Field;
    const symbol = new vscode.DocumentSymbol(n.name, n.name, kind, range, sel);
    symbol.children = n.children.map((c) => this.toSymbol(c));
    return symbol;
  }
}
