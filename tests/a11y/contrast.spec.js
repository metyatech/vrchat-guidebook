const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default

const THEMES = ['light', 'dark']
const INTERACTIVE_SELECTOR = '#VPContent a, #VPContent button, #VPContent [role="button"], .VPHero a'
const MAX_ELEMENTS_PER_PAGE = 8

function extractPathsFromSitemap(xmlText) {
  const matches = [...xmlText.matchAll(/<loc>(.*?)<\/loc>/g)]
  const paths = matches.map((match) => new URL(match[1]).pathname)
  return [...new Set(paths)]
}

async function setThemeAndOpen(page, path, theme) {
  await page.addInitScript(([storageKey, storageValue]) => {
    localStorage.setItem(storageKey, storageValue)
  }, ['vitepress-theme-appearance', theme])
  await page.goto(path, { waitUntil: 'networkidle' })
  await page.waitForSelector('#VPContent')
}

async function runContrastCheck(page, includeSelector) {
  const builder = new AxeBuilder({ page }).withRules(['color-contrast'])
  if (includeSelector) {
    builder.include(includeSelector)
  }
  return builder.analyze()
}

async function collectStateIssues(page, path, theme) {
  const issues = []
  const baseResult = await runContrastCheck(page)
  for (const violation of baseResult.violations) {
    issues.push({
      path,
      theme,
      state: 'default',
      id: violation.id,
      description: violation.description
    })
  }

  const candidates = page.locator(INTERACTIVE_SELECTOR)
  const count = Math.min(await candidates.count(), MAX_ELEMENTS_PER_PAGE)

  for (let index = 0; index < count; index += 1) {
    const element = candidates.nth(index)
    if (!(await element.isVisible())) {
      continue
    }
    const textContent = (await element.innerText()).trim()
    if (!textContent) {
      continue
    }

    const markerName = 'data-contrast-target'
    await element.evaluate((node, attrName) => node.setAttribute(attrName, '1'), markerName)
    try {
      await element.hover({ force: true })
      await page.waitForTimeout(60)
      const hoverResult = await runContrastCheck(page, `[${markerName}="1"]`)
      for (const violation of hoverResult.violations) {
        issues.push({
          path,
          theme,
          state: 'hover',
          id: violation.id,
          description: violation.description
        })
      }

      await element.focus()
      await page.waitForTimeout(60)
      const focusResult = await runContrastCheck(page, `[${markerName}="1"]`)
      for (const violation of focusResult.violations) {
        issues.push({
          path,
          theme,
          state: 'focus',
          id: violation.id,
          description: violation.description
        })
      }
    } finally {
      await element.evaluate((node, attrName) => node.removeAttribute(attrName), markerName)
    }
  }

  return issues
}

function formatIssues(issues) {
  return issues
    .map((issue) => `${issue.theme} ${issue.path} [${issue.state}] ${issue.id}: ${issue.description}`)
    .join('\n')
}

test('color contrast is valid for light/dark and interactive states', async ({ browser, request }) => {
  test.setTimeout(300000)
  const sitemapResponse = await request.get('/sitemap.xml')
  expect(sitemapResponse.ok()).toBeTruthy()
  const sitemapXml = await sitemapResponse.text()
  const paths = extractPathsFromSitemap(sitemapXml)
  expect(paths.length).toBeGreaterThan(0)

  const allIssues = []
  for (const theme of THEMES) {
    const context = await browser.newContext({
      baseURL: process.env.BASE_URL || 'http://127.0.0.1:4175'
    })
    try {
      for (const path of paths) {
        const page = await context.newPage()
        try {
          await setThemeAndOpen(page, path, theme)
          const issues = await collectStateIssues(page, path, theme)
          allIssues.push(...issues)
        } finally {
          await page.close()
        }
      }
    } finally {
      await context.close()
    }
  }

  expect(allIssues, formatIssues(allIssues)).toEqual([])
})
