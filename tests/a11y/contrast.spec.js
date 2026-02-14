const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default

const THEMES = ['light', 'dark']
const INTERACTIVE_SELECTOR = '#VPContent a, #VPContent button, #VPContent [role="button"], .VPHero a'
const BOUNDARY_SELECTOR = '.VPFeature, .guide-card, .section-block'
const MAX_ELEMENTS_PER_PAGE = 8
const MIN_BACKGROUND_CONTRAST = 1.25
const MIN_BORDER_CONTRAST = 1.5

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

async function collectBoundaryIssues(page, path, theme) {
  const issues = await page.evaluate(
    ({ selector, minBackgroundContrast, minBorderContrast }) => {
      const candidates = [...document.querySelectorAll(selector)]
      const colorProbe = document.createElement('span')

      const parseColor = (colorText) => {
        if (!colorText) {
          return null
        }
        colorProbe.style.color = ''
        colorProbe.style.color = colorText
        const normalized = colorProbe.style.color || colorText
        if (normalized === 'transparent') {
          return { red: 0, green: 0, blue: 0, alpha: 0 }
        }

        if (normalized.startsWith('#')) {
          const hex = normalized.slice(1)
          if (hex.length === 3) {
            const red = Number.parseInt(`${hex[0]}${hex[0]}`, 16)
            const green = Number.parseInt(`${hex[1]}${hex[1]}`, 16)
            const blue = Number.parseInt(`${hex[2]}${hex[2]}`, 16)
            return { red, green, blue, alpha: 1 }
          }
          if (hex.length === 6) {
            const red = Number.parseInt(hex.slice(0, 2), 16)
            const green = Number.parseInt(hex.slice(2, 4), 16)
            const blue = Number.parseInt(hex.slice(4, 6), 16)
            return { red, green, blue, alpha: 1 }
          }
          if (hex.length === 8) {
            const red = Number.parseInt(hex.slice(0, 2), 16)
            const green = Number.parseInt(hex.slice(2, 4), 16)
            const blue = Number.parseInt(hex.slice(4, 6), 16)
            const alpha = Number.parseInt(hex.slice(6, 8), 16) / 255
            return { red, green, blue, alpha }
          }
          return null
        }

        const match = normalized.match(/rgba?\(([^)]+)\)/)
        if (!match) {
          return null
        }
        const parts = match[1].split(',').map((part) => part.trim())
        if (parts.length < 3) {
          return null
        }
        const red = Number(parts[0])
        const green = Number(parts[1])
        const blue = Number(parts[2])
        const alpha = parts.length >= 4 ? Number(parts[3]) : 1
        if ([red, green, blue, alpha].some(Number.isNaN)) {
          return null
        }
        return { red, green, blue, alpha }
      }

      const blendColor = (foreground, background) => {
        const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha)
        if (alpha <= 0) {
          return { red: 0, green: 0, blue: 0, alpha: 0 }
        }
        return {
          red: (foreground.red * foreground.alpha + background.red * background.alpha * (1 - foreground.alpha)) / alpha,
          green: (foreground.green * foreground.alpha + background.green * background.alpha * (1 - foreground.alpha)) / alpha,
          blue: (foreground.blue * foreground.alpha + background.blue * background.alpha * (1 - foreground.alpha)) / alpha,
          alpha
        }
      }

      const toLinear = (value) => {
        const normalized = value / 255
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      }

      const luminance = (color) => (
        0.2126 * toLinear(color.red) + 0.7152 * toLinear(color.green) + 0.0722 * toLinear(color.blue)
      )

      const contrast = (first, second) => {
        const bright = luminance(first)
        const dark = luminance(second)
        const [maxLum, minLum] = bright >= dark ? [bright, dark] : [dark, bright]
        return (maxLum + 0.05) / (minLum + 0.05)
      }

      const resolveEffectiveBackground = (node) => {
        let current = node
        let output = { red: 255, green: 255, blue: 255, alpha: 1 }
        const chain = []
        while (current) {
          chain.unshift(current)
          current = current.parentElement
        }

        for (const chainNode of chain) {
          const style = window.getComputedStyle(chainNode)
          const parsed = parseColor(style.backgroundColor)
          if (!parsed || parsed.alpha <= 0) {
            continue
          }
          output = blendColor(parsed, output)
        }
        return output
      }

      const results = []
      for (const candidate of candidates) {
        const rect = candidate.getBoundingClientRect()
        if (rect.width < 80 || rect.height < 40) {
          continue
        }

        const candidateStyle = window.getComputedStyle(candidate)
        const parent = candidate.parentElement
        if (!parent) {
          continue
        }

        const candidateBackground = resolveEffectiveBackground(candidate)
        const parentBackground = resolveEffectiveBackground(parent)
        const backgroundContrast = contrast(candidateBackground, parentBackground)

        const borderWidth = Number.parseFloat(candidateStyle.borderTopWidth) || 0
        const borderColor = parseColor(candidateStyle.borderTopColor)
        let borderContrast = 0
        if (borderWidth > 0 && borderColor && borderColor.alpha > 0) {
          borderContrast = contrast(borderColor, parentBackground)
        }

        if (backgroundContrast < minBackgroundContrast && borderContrast < minBorderContrast) {
          const className = candidate.className || candidate.tagName.toLowerCase()
          results.push({
            className: String(className),
            backgroundContrast: Number(backgroundContrast.toFixed(2)),
            borderContrast: Number(borderContrast.toFixed(2))
          })
        }
      }

      return results
    },
    {
      selector: BOUNDARY_SELECTOR,
      minBackgroundContrast: MIN_BACKGROUND_CONTRAST,
      minBorderContrast: MIN_BORDER_CONTRAST
    }
  )

  return issues.map((issue) => ({
    path,
    theme,
    state: 'boundary',
    id: 'container-boundary-contrast',
    description: `class=${issue.className} bg=${issue.backgroundContrast} border=${issue.borderContrast}`
  }))
}

async function collectStateIssues(page, path, theme) {
  const formatViolation = (violation) => {
    const targets = violation.nodes
      .flatMap((node) => node.target || [])
      .slice(0, 3)
      .join(' | ')
    const targetText = targets ? ` targets: ${targets}` : ''
    return `${violation.description}${targetText}`
  }

  const issues = []
  const baseResult = await runContrastCheck(page)
  for (const violation of baseResult.violations) {
    issues.push({
      path,
      theme,
      state: 'default',
      id: violation.id,
      description: formatViolation(violation)
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
          description: formatViolation(violation)
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
          description: formatViolation(violation)
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
          const boundaryIssues = await collectBoundaryIssues(page, path, theme)
          allIssues.push(...issues)
          allIssues.push(...boundaryIssues)
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
