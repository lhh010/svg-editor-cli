import * as vscode from "vscode";
import { buildOutline } from "./outline";

/**
 * VSCode 扩展入口：SVG 文件标记（Explorer 徽标 "[]"）与 SVG 大纲（原生 Outline）。
 * VSCode 与插件的职责划分、FileDecorationProvider 与 Decorator/Adapter 模式的对应
 * 关系见仓库 doc/README.md 第一部分 A.3。
 */
export function activate(context: vscode.ExtensionContext): void {
  // A.1 文件标记：注册 FileDecorationProvider，由 VSCode 在渲染 Explorer 时回调
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgFileDecorationProvider())
  );
  // A.2 大纲：注册 DocumentSymbolProvider，由 VSCode 在大纲视图需要时回调
  const selector: vscode.DocumentSelector = [{ pattern: "**/*.svg" }, { scheme: "untitled", language: "xml" }];
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(selector, new SvgOutlineProvider())
  );
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
