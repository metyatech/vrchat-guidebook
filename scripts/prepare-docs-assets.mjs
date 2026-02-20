import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sourceDir = path.join(rootDir, "artifacts");
const targetDir = path.join(rootDir, "docs", "public", "artifacts");

async function main() {
  try {
    await fs.access(sourceDir);
  } catch {
    console.warn(`docs assets: ${sourceDir} not found; skipping.`);
    return;
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });
  console.log(`docs assets: copied ${sourceDir} -> ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

