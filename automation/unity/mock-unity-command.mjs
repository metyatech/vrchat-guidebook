#!/usr/bin/env node
import { copyFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const args = parseArgs(process.argv.slice(2));

if (!args.outputDir || !args.manifestPath) {
  throw new Error("--output-dir and --manifest-path are required");
}

const outputDir = resolve(args.outputDir);
const manifestPath = resolve(args.manifestPath);
const screenshotsDir = join(outputDir, "screenshots");
const videoDir = join(outputDir, "video");

await mkdir(screenshotsDir, { recursive: true });
await mkdir(videoDir, { recursive: true });
await mkdir(dirname(manifestPath), { recursive: true });

const openStepPath = join(screenshotsDir, "open-unity-editor.png");
const dragStepPath = join(screenshotsDir, "drag-hierarchy-item.png");

await copyFile(resolve("docs/avatar-customization/physbone/images/04-freeflycamera-a.jpg"), openStepPath);
await copyFile(resolve("docs/avatar-customization/physbone/images/05-freeflycamera-b.png"), dragStepPath);
await annotateImage(openStepPath, buildClickOverlay());
await annotateImage(dragStepPath, buildDragOverlay());

const videoPath = join(videoDir, "unity-basic-annotated.mp4");
await buildRawVideo(openStepPath, dragStepPath, videoPath);

const startedAt = Date.now();
const manifest = {
  steps: [
    {
      id: "open-unity-editor",
      title: "Open Unity Editor",
      description: "Open the Unity Editor main window.",
      imagePath: openStepPath,
      annotation: {
        type: "click",
        box: {
          x: 280,
          y: 110,
          width: 230,
          height: 70
        }
      },
      startedAtMs: startedAt,
      endedAtMs: startedAt + 1800
    },
    {
      id: "drag-hierarchy-item",
      title: "Drag item to Scene view",
      description: "Drag an object from Hierarchy to Scene view.",
      imagePath: dragStepPath,
      annotation: {
        type: "dragDrop",
        from: {
          x: 250,
          y: 320
        },
        to: {
          x: 860,
          y: 340
        }
      },
      startedAtMs: startedAt + 2200,
      endedAtMs: startedAt + 4200
    }
  ],
  videoPath
};

await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

async function buildRawVideo(imageAPath, imageBPath, outputPath) {
  const args = [
    "-y",
    "-loop",
    "1",
    "-t",
    "2",
    "-i",
    imageAPath,
    "-loop",
    "1",
    "-t",
    "2",
    "-i",
    imageBPath,
    "-filter_complex",
    "[0:v]scale=1280:720,setsar=1[v0];[1:v]scale=1280:720,setsar=1[v1];[v0][v1]concat=n=2:v=1:a=0[out]",
    "-map",
    "[out]",
    "-pix_fmt",
    "yuv420p",
    outputPath
  ];

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`ffmpeg failed with exit code ${code ?? "unknown"}`));
      }
    });
  });
}

async function annotateImage(imagePath, overlaySvg) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) {
    throw new Error(`Could not read image size: ${imagePath}`);
  }

  const overlay = overlaySvg(width, height);
  const composited = await image
    .composite([
      {
        input: Buffer.from(overlay),
        left: 0,
        top: 0
      }
    ])
    .png()
    .toBuffer();
  const tempPath = `${imagePath}.tmp.png`;
  await sharp(composited).toFile(tempPath);
  await rename(tempPath, imagePath);
}

function buildClickOverlay() {
  return (width, height) =>
    [
      `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
      '<rect x="280" y="110" width="230" height="70" fill="none" stroke="#ff0000" stroke-width="5" />',
      "</svg>",
    ].join("");
}

function buildDragOverlay() {
  return (width, height) =>
    [
      `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
      "<defs>",
      '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">',
      '<polygon points="0 0, 10 3.5, 0 7" fill="#ff0000" />',
      "</marker>",
      "</defs>",
      '<rect x="240" y="310" width="24" height="24" fill="#ff0000" opacity="0.7" />',
      '<rect x="848" y="328" width="24" height="24" fill="#ff0000" opacity="0.7" />',
      '<line x1="252" y1="322" x2="860" y2="340" stroke="#ff0000" stroke-width="6" marker-end="url(#arrowhead)" />',
      "</svg>",
    ].join("");
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--output-dir") {
      parsed.outputDir = rawArgs[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--manifest-path") {
      parsed.manifestPath = rawArgs[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}
