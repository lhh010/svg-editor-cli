# Metrics（`final` -> `HEAD`）

> 由 `node scripts/metrics.mjs` 从 git 历史自动生成；行数含注释空行；圈复杂度为决策关键字计数启发式。

## 汇总（CLI 范围：kernel / host / plugins）

| 类别 | final 文件数 | final 行数 | p2 文件数 | p2 行数 | 行数增量 | 复杂度(final -> p2) |
|-|-|-|-|-|-|-|
| kernel | 33 | 1943 | 33 | 1943 | +0 | 302 -> 302 |
| host | 0 | 0 | 0 | 0 | +0 | 0 -> 0 |
| plugins | 0 | 0 | 0 | 0 | +0 | 0 -> 0 |

## 单独列出（不计入 CLI 重构增量）

| 类别 | final 文件/行数 | p2 文件/行数 |
|-|-|-|
| tests | 1 / 210 | 1 / 210 |
| vscode | 0 / 0 | 0 / 0 |

## kernel 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|
| src/cli/CommandDispatcher.ts | 164 | 44 |
| src/cli/Help.ts | 35 | 1 |
| src/cli/Main.ts | 14 | 2 |
| src/cli/Repl.ts | 38 | 10 |
| src/cli/Tokenizer.ts | 29 | 9 |
| src/commands/AddtoCommand.ts | 48 | 5 |
| src/commands/Command.ts | 10 | 1 |
| src/commands/CommandHistory.ts | 48 | 4 |
| src/commands/CreateCommand.ts | 51 | 5 |
| src/commands/DeleteCommand.ts | 36 | 5 |
| src/commands/GroupCommand.ts | 63 | 12 |
| src/commands/MoveCommand.ts | 34 | 3 |
| src/commands/Resolve.ts | 29 | 6 |
| src/commands/ScaleCommand.ts | 28 | 2 |
| src/commands/SetCommand.ts | 33 | 3 |
| src/commands/UngroupCommand.ts | 45 | 6 |
| src/commands/ZOrderCommand.ts | 34 | 3 |
| src/core/Editor.ts | 106 | 11 |
| src/document/ShapeParent.ts | 10 | 1 |
| src/document/SvgDocument.ts | 85 | 10 |
| src/io/SvgReader.ts | 105 | 25 |
| src/io/SvgWriter.ts | 27 | 2 |
| src/io/XmlParser.ts | 128 | 24 |
| src/shapes/Circle.ts | 63 | 10 |
| src/shapes/Ellipse.ts | 71 | 11 |
| src/shapes/Group.ts | 115 | 18 |
| src/shapes/Line.ts | 66 | 8 |
| src/shapes/Rect.ts | 70 | 11 |
| src/shapes/Shape.ts | 130 | 14 |
| src/shapes/ShapeFactory.ts | 94 | 13 |
| src/shapes/Text.ts | 65 | 8 |
| src/view/ShowRenderer.ts | 12 | 3 |
| src/view/TreeRenderer.ts | 57 | 12 |

## host 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|


## plugins 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|


## tests 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|
| src/tests/run.ts | 210 | 8 |

## vscode 文件清单（p2）

| 文件 | 行数 | 复杂度 |
|-|-|-|

