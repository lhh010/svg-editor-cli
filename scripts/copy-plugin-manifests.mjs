/** 构建后把 plugins/*/package.json（contributes 清单）复制到 dist 对应目录。 */
import { readdirSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const src = "plugins";
const dest = "dist/plugins";
if (!existsSync(src)) process.exit(0);
for (const name of readdirSync(src, { withFileTypes: true })) {
  if (!name.isDirectory()) continue;
  const from = join(src, name.name, "package.json");
  const to = join(dest, name.name, "package.json");
  if (existsSync(from)) {
    mkdirSync(join(dest, name.name), { recursive: true });
    copyFileSync(from, to);
    console.log("manifest copied:", to);
  }
}
