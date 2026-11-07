# Metrics（`final` -> `HEAD`）

> 由 `node scripts/metrics.mjs` 从 git 历史自动生成；行数含注释空行；圈复杂度为决策关键字计数启发式。

## 汇总（CLI 范围：kernel / host / plugins）

| 类别 | final 文件数 | final 行数 | p2 文件数 | p2 行数 | 行数增量 | 复杂度(final -> p2) |
|-|-|-|-|-|-|-|
| kernel | 33 | 1943 | 33 | 2355 | +412 | 302 -> 351 |
| host | 0 | 0 | 4 | 407 | +407 | 0 -> 67 |
| plugins | 0 | 0 | 8 | 663 | +663 | 0 -> 73 |

## 单独列出（不计入 CLI 重构增量）

| 类别 | final 文件/行数 | p2 文件/行数 |
|-|-|-|
| tests | 1 / 210 | 7 / 485 |
| vscode | 0 / 0 | 4 / 297 |

## kernel 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|
| src/cli/CommandDispatcher.ts | 189 | 48 |
| src/cli/Help.ts | 35 | 1 |
| src/cli/Repl.ts | 38 | 10 |
| src/cli/Tokenizer.ts | 29 | 9 |
| src/commands/AddtoCommand.ts | 51 | 7 |
| src/commands/Command.ts | 10 | 1 |
| src/commands/CommandHistory.ts | 48 | 4 |
| src/commands/CreateCommand.ts | 62 | 13 |
| src/commands/DeleteCommand.ts | 40 | 7 |
| src/commands/GroupCommand.ts | 68 | 15 |
| src/commands/MoveCommand.ts | 34 | 3 |
| src/commands/Resolve.ts | 29 | 6 |
| src/commands/ScaleCommand.ts | 28 | 2 |
| src/commands/SetCommand.ts | 85 | 12 |
| src/commands/UngroupCommand.ts | 45 | 6 |
| src/commands/ZOrderCommand.ts | 34 | 3 |
| src/core/Editor.ts | 113 | 12 |
| src/document/ShapeParent.ts | 10 | 1 |
| src/document/SvgDocument.ts | 85 | 10 |
| src/io/SvgReader.ts | 102 | 24 |
| src/io/SvgWriter.ts | 27 | 2 |
| src/io/XmlParser.ts | 131 | 24 |
| src/kernel/ExtensionPoints.ts | 99 | 1 |
| src/kernel/Registries.ts | 274 | 35 |
| src/shapes/Circle.ts | 63 | 10 |
| src/shapes/Ellipse.ts | 71 | 11 |
| src/shapes/Group.ts | 126 | 18 |
| src/shapes/Line.ts | 66 | 8 |
| src/shapes/Rect.ts | 70 | 11 |
| src/shapes/Shape.ts | 145 | 14 |
| src/shapes/Text.ts | 65 | 8 |
| src/view/ShowRenderer.ts | 12 | 3 |
| src/view/TreeRenderer.ts | 71 | 12 |

## host 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|
| src/builtin/BuiltinShapeProviders.ts | 143 | 27 |
| src/host/Assembly.ts | 51 | 2 |
| src/host/Main.ts | 60 | 7 |
| src/host/PluginLoader.ts | 153 | 31 |

## plugins 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|
| plugins/plugin-cmd-dir/index.ts | 81 | 9 |
| plugins/plugin-cmd-stats/index.ts | 46 | 6 |
| plugins/plugin-decorator-box-label/index.ts | 22 | 3 |
| plugins/plugin-decorator-box-label/label.test.ts | 55 | 6 |
| plugins/plugin-decorator-star/index.ts | 69 | 11 |
| plugins/plugin-decorator-star/star.test.ts | 90 | 7 |
| plugins/plugin-shape-box/box.test.ts | 139 | 11 |
| plugins/plugin-shape-box/index.ts | 161 | 20 |

## tests 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|
| src/tests/phase2.test.ts | 213 | 11 |
| src/tests/run.ts | 227 | 10 |
| test-fixtures/plugins/dup-stats/index.js | 11 | 1 |
| test-fixtures/plugins/mismatch/index.js | 6 | 1 |
| test-fixtures/plugins/no-default/index.js | 2 | 1 |
| test-fixtures/plugins/partial-and-dup/index.js | 21 | 1 |
| test-fixtures/plugins/throws/index.js | 5 | 1 |

## vscode 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|
| vscode-svg-tools/src/extension.ts | 47 | 4 |
| vscode-svg-tools/src/outline.ts | 69 | 7 |
| vscode-svg-tools/src/parser.ts | 121 | 29 |
| vscode-svg-tools/tests/outline.test.mjs | 60 | 3 |
