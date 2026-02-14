const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')
const handler = require('serve-handler')

const host = '127.0.0.1'
const port = 4174
const publicDir = path.resolve(process.cwd(), 'docs/.vitepress/dist')
const pa11yCli = path.resolve(process.cwd(), 'node_modules/pa11y-ci/bin/pa11y-ci.js')
const sitemapUrl = `http://${host}:${port}/sitemap.xml`

function runPa11y() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pa11yCli, '--config', '.pa11yci.json', '--sitemap', sitemapUrl], {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

async function main() {
  const server = http.createServer((request, response) =>
    handler(request, response, { public: publicDir })
  )

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, resolve)
  })

  let exitCode = 1
  try {
    exitCode = await runPa11y()
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }

  process.exit(exitCode)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
