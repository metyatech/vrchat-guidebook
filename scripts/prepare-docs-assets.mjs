import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const assets = [
  "studio-generated-unity/video/studio-generated-unity-raw.mp4",
  "unity-editor-basic/video/unity-basic-annotated.mp4",
  "web-example/video/web-example-annotated.mp4",
  "unity-editor-basic/screenshots/open-unity-editor.png",
  "unity-editor-basic/screenshots/drag-hierarchy-item.png",
  "web-example/screenshots/open-example.png",
  "web-example/screenshots/click-more-info.png",
];

async function main() {
  const sourceRoot = path.join(rootDir, "artifacts");
  const targetRoot = path.join(rootDir, "docs", "public", "guide-assets");

  let copied = 0;
  for (const asset of assets) {
    const sourcePath = path.join(sourceRoot, asset);
    const targetPath = path.join(targetRoot, asset);
    try {
      await fs.access(sourcePath);
    } catch {
      continue;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
    copied += 1;
  }

  if (copied === 0) {
    console.warn(`docs assets: ${sourceRoot} not found; skipping.`);
    return;
  }

  console.log(`docs assets: copied ${copied} file(s) -> ${targetRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
