const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const handler = require("serve-handler");

const net = require("node:net");

const host = "127.0.0.1";
const publicDir = path.resolve(process.cwd(), "docs/.vitepress/dist");
const pa11yCli = path.resolve(process.cwd(), "node_modules/pa11y-ci/bin/pa11y-ci.js");

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, host, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function buildDocs(port) {
  return new Promise((resolve, reject) => {
    const vitepressBin = path.resolve(process.cwd(), "node_modules/vitepress/bin/vitepress.js");
    const child = spawn(process.execPath, [vitepressBin, "build", "docs"], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: {
        ...process.env,
        SITE_URL: `http://${host}:${port}`,
        SITE_BASE: "/"
      }
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`vitepress build failed (${code})`))
    );
  });
}

function runPa11y(sitemapUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [pa11yCli, "--config", ".pa11yci.json", "--sitemap", sitemapUrl],
      {
        stdio: "inherit",
        cwd: process.cwd()
      }
    );
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const port = await findFreePort();

  await buildDocs(port);

  const server = http.createServer((request, response) =>
    handler(request, response, { public: publicDir })
  );

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const sitemapUrl = `http://${host}:${port}/sitemap.xml`;

  let exitCode = 1; // eslint-disable-line no-useless-assignment
  try {
    exitCode = await runPa11y(sitemapUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
