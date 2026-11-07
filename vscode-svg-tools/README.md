# SVG Tools — VSCode 扩展（PJ1 Phase 2 第一部分）

为 VSCode 提供两件事：

- **A.1 SVG 文件标记**：Explorer 中 `.svg` 文件旁显示 `[]` 徽标（不修改文件名与内容；非 SVG 文件与目录不标记）。
- **A.2 SVG 大纲**：打开 SVG 文本后，在原生 Outline 视图展示元素层级——容器与叶子嵌套、
  有 id 显示 `标签名#id`、无 id 仅显示标签名；点击节点定位到对应开始标签；编辑后大纲自动更新；
  XML 不完整时大纲暂时清空，扩展不崩溃。

## 安装与运行（调试方式，无需发布）

1. 前置：VSCode（≥1.80）+ Node.js；本目录执行 `npm install`。
2. 编译：`npm run compile`（产出 `out/extension.js`）。
3. 用 VSCode 打开本目录（`code vscode-svg-tools`）。
4. 按 **F5**（Run → Start Debugging）选择 "Extension Host"，会启动一个新的扩展开发宿主窗口。
5. 在开发宿主窗口中验证：
   - 打开资源管理器，含 `.svg` 文件的目录里 SVG 文件名右侧出现 `[]`（可复制本目录的 `example.svg` 到任意工作区）；
   - 打开 `example.svg`，左侧 OUTLINE 视图出现 `svg → g#flowchart → g#node1 → rect#start ...` 层级；
   - 点击 `rect#start`，编辑器定位到第 5 行开始标签；把某个 `id="start"` 改名，大纲随编辑刷新；
   - 删掉一个闭合标签制造不完整 XML——大纲清空但扩展不崩溃，补回后恢复。

大纲/解析核心逻辑（`src/outline.ts`、`src/parser.ts`）不依赖 vscode 模块，
`npm test` 在纯 node 环境运行 15 项断言（嵌套分组、无 id 元素、编辑更新、不完整 XML 等）。

## 截图

运行截图见仓库 `docs/images/`（vscode-badge.png / vscode-outline.png），文档说明见 `doc/README.md` A.3 节。
