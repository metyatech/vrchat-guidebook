const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");

test("web pipeline produces expected artifacts", () => {
  const markdownPath = path.join(rootDir, "docs/controls/auto-web-example.md");
  assert.ok(fs.existsSync(markdownPath), "generated markdown exists");

  const markdown = fs.readFileSync(markdownPath, "utf8");

  // Frontmatter badges
  assert.ok(markdown.startsWith("---\n"), "has YAML frontmatter");
  assert.ok(markdown.includes("stepCount:"), "has stepCount in frontmatter");
  assert.ok(markdown.includes("difficulty:"), "has difficulty in frontmatter");
  assert.ok(markdown.includes("timeEstimate:"), "has timeEstimate in frontmatter");

  // Scenario comment
  assert.ok(markdown.includes("<!-- scenario_id: web-example -->"), "has scenario_id comment");

  // Video embed
  assert.ok(markdown.includes("<video controls"), "has video element");
  assert.ok(markdown.includes("/guide-assets/web-example/video/"), "video uses assetBaseUrl path");

  // Mermaid flowchart
  assert.ok(markdown.includes("```mermaid"), "has mermaid flowchart");
  assert.ok(markdown.includes("graph TD"), "mermaid uses TD direction");

  // Step images
  assert.ok(
    markdown.includes("/guide-assets/web-example/screenshots/"),
    "images use assetBaseUrl path"
  );
  assert.ok(markdown.includes("## 1. Open example.com"), "has numbered step heading");

  // No filesystem-relative paths
  assert.ok(!markdown.includes("../../artifacts"), "no filesystem-relative artifact paths");
});

test("web pipeline includes screenshot assets", () => {
  const screenshotsDir = path.join(rootDir, "docs/public/guide-assets/web-example/screenshots");
  assert.ok(fs.existsSync(screenshotsDir), "screenshots directory exists");

  const files = fs.readdirSync(screenshotsDir);
  assert.ok(files.length >= 2, `at least 2 screenshots (found ${files.length})`);
  assert.ok(
    files.some((f) => f.endsWith(".png")),
    "has PNG screenshots"
  );
});

test("web pipeline includes video asset", () => {
  const videoDir = path.join(rootDir, "docs/public/guide-assets/web-example/video");
  assert.ok(fs.existsSync(videoDir), "video directory exists");

  const files = fs.readdirSync(videoDir);
  assert.ok(
    files.some((f) => f.includes("annotated") && f.endsWith(".mp4")),
    "has annotated MP4 video"
  );
});

test("web pipeline produces animation artifact when enabled", () => {
  const animationDir = path.join(rootDir, "artifacts/web-example/animation");
  if (!fs.existsSync(animationDir)) {
    return; // animation not enabled in current blueprint
  }

  const files = fs.readdirSync(animationDir);
  assert.ok(
    files.some((f) => f.endsWith(".gif") || f.endsWith(".webp")),
    "has GIF or WebP animation"
  );

  // Verify markdown references animation
  const markdown = fs.readFileSync(path.join(rootDir, "docs/controls/auto-web-example.md"), "utf8");
  assert.ok(
    markdown.includes("/guide-assets/web-example/animation/"),
    "markdown embeds animation with assetBaseUrl path"
  );
});

test("docs:prepare copies artifacts to public dir", () => {
  const publicDir = path.join(rootDir, "docs/public/guide-assets/web-example");
  assert.ok(fs.existsSync(publicDir), "public guide-assets dir exists");

  const videoPath = path.join(publicDir, "video/web-example-annotated.mp4");
  assert.ok(fs.existsSync(videoPath), "video copied to public dir");

  const screenshotsDir = path.join(publicDir, "screenshots");
  assert.ok(fs.existsSync(screenshotsDir), "screenshots dir in public");
});
