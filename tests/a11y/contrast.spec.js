const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default

const THEMES = ['light', 'dark']
const INTERACTIVE_SELECTOR = '#VPContent a, #VPContent button, #VPContent [role="button"], .VPHero a'
const BOUNDARY_SELECTOR = 'body *'
const MAX_ELEMENTS_PER_PAGE = 8
const MIN_BACKGROUND_CONTRAST = 1.25
const MIN_BORDER_CONTRAST = 3
const MIN_BOUNDARY_AREA = 600
const MAX_BOUNDARY_ISSUES_PER_PAGE = 120

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
    ({ selector, minBackgroundContrast, minBorderContrast, minBoundaryArea, maxBoundaryIssuesPerPage }) => {
      const candidates = [...document.querySelectorAll(selector)].filter(
        (node) => node instanceof HTMLElement
      )
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

      const extractColorTokens = (text) => {
        if (!text || text === 'none') {
          return []
        }
        const tokenPattern = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|transparent/g
        return text.match(tokenPattern) || []
      }

      const parseColorList = (tokens) => (
        tokens
          .map((token) => parseColor(token))
          .filter((color) => color && color.alpha > 0)
      )

      const averageColors = (colors) => {
        if (!colors.length) {
          return null
        }
        let weightTotal = 0
        let redTotal = 0
        let greenTotal = 0
        let blueTotal = 0
        let alphaTotal = 0
        for (const color of colors) {
          const weight = Math.max(color.alpha, 0.05)
          weightTotal += weight
          redTotal += color.red * weight
          greenTotal += color.green * weight
          blueTotal += color.blue * weight
          alphaTotal += color.alpha
        }
        return {
          red: redTotal / weightTotal,
          green: greenTotal / weightTotal,
          blue: blueTotal / weightTotal,
          alpha: Math.min(1, alphaTotal / colors.length)
        }
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

      const resolveBaseColor = () => {
        const htmlColor = parseColor(window.getComputedStyle(document.documentElement).backgroundColor)
        if (htmlColor && htmlColor.alpha > 0) {
          return htmlColor
        }
        const bodyColor = parseColor(window.getComputedStyle(document.body).backgroundColor)
        if (bodyColor && bodyColor.alpha > 0) {
          return bodyColor
        }
        if (document.documentElement.classList.contains('dark')) {
          return { red: 9, green: 17, blue: 32, alpha: 1 }
        }
        return { red: 255, green: 255, blue: 255, alpha: 1 }
      }

      const resolveRepresentativeBackgroundColor = (style) => {
        const colors = []
        const solid = parseColor(style.backgroundColor)
        if (solid && solid.alpha > 0) {
          colors.push(solid)
        }
        const gradientColors = parseColorList(extractColorTokens(style.backgroundImage))
        colors.push(...gradientColors)
        return averageColors(colors)
      }

      const resolveEdgeCueColors = (style) => {
        const edgeColors = []
        const borderWidths = [
          Number.parseFloat(style.borderTopWidth) || 0,
          Number.parseFloat(style.borderRightWidth) || 0,
          Number.parseFloat(style.borderBottomWidth) || 0,
          Number.parseFloat(style.borderLeftWidth) || 0
        ]
        const maxBorderWidth = Math.max(...borderWidths)
        if (maxBorderWidth > 0) {
          const borderColor = parseColor(style.borderTopColor)
          if (borderColor && borderColor.alpha > 0) {
            edgeColors.push(borderColor)
          }
        }

        const outlineWidth = Number.parseFloat(style.outlineWidth) || 0
        if (outlineWidth > 0 && style.outlineStyle !== 'none') {
          const outlineColor = parseColor(style.outlineColor)
          if (outlineColor && outlineColor.alpha > 0) {
            edgeColors.push(outlineColor)
          }
        }

        const shadowColors = parseColorList(extractColorTokens(style.boxShadow))
        edgeColors.push(...shadowColors)
        return edgeColors
      }

      const hasRoundedCorner = (style) => {
        const radii = [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius
        ]
          .map((value) => Number.parseFloat(value) || 0)
        return Math.max(...radii) >= 3
      }

      const resolveEffectiveBackgroundColor = (node) => {
        let current = node
        let output = resolveBaseColor()
        const chain = []
        while (current) {
          chain.unshift(current)
          current = current.parentElement
        }

        for (const chainNode of chain) {
          const style = window.getComputedStyle(chainNode)
          const backgroundColor = parseColor(style.backgroundColor)
          if (!backgroundColor) {
            continue
          }
          output = blendColor(backgroundColor, output)
        }
        return output
      }

      const results = []
      for (const candidate of candidates) {
        const rect = candidate.getBoundingClientRect()
        if (rect.width * rect.height < minBoundaryArea) {
          continue
        }

        const candidateStyle = window.getComputedStyle(candidate)
        if (
          candidateStyle.display === 'none' ||
          candidateStyle.visibility !== 'visible' ||
          Number.parseFloat(candidateStyle.opacity) < 0.05
        ) {
          continue
        }

        const tagName = candidate.tagName.toLowerCase()
        const isInteractive = candidate.matches('a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])')
        const containerDisplays = new Set(['block', 'flex', 'grid', 'table', 'flow-root', 'list-item'])
        const isContainer = containerDisplays.has(candidateStyle.display)
        if (!isInteractive && !isContainer) {
          continue
        }

        if (!isInteractive && candidate.closest('a[href], button, [role="button"]')) {
          continue
        }

        if (!isInteractive && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'kbd', 'hr'].includes(tagName)) {
          continue
        }

        const parent = candidate.parentElement
        if (!parent) {
          continue
        }

        const parentBackgroundColor = resolveEffectiveBackgroundColor(parent)
        const backgroundCueColor = resolveRepresentativeBackgroundColor(candidateStyle)
        const edgeCueColors = resolveEdgeCueColors(candidateStyle)
        const hasBackgroundCue = Boolean(backgroundCueColor)
        const hasEdgeCue = edgeCueColors.length > 0

        if (!hasBackgroundCue && !hasEdgeCue) {
          continue
        }

        const roundedCorner = hasRoundedCorner(candidateStyle)
        if (!hasEdgeCue && !roundedCorner) {
          continue
        }

        let backgroundContrast = 0
        if (hasBackgroundCue) {
          const candidateBackground = blendColor(backgroundCueColor, parentBackgroundColor)
          backgroundContrast = contrast(candidateBackground, parentBackgroundColor)
        }

        let borderContrast = 0
        if (hasEdgeCue) {
          const contrasts = edgeCueColors.map((edgeColor) => {
            const candidateEdge = blendColor(edgeColor, parentBackgroundColor)
            return contrast(candidateEdge, parentBackgroundColor)
          })
          borderContrast = Math.max(...contrasts)
        }

        const visuallyDistinctBackground = hasBackgroundCue && backgroundContrast >= 1.05
        const intentionallySeparated = hasEdgeCue || roundedCorner || visuallyDistinctBackground
        if (!intentionallySeparated) {
          continue
        }

        const passesBoundaryContrast =
          (hasBackgroundCue && backgroundContrast >= minBackgroundContrast) ||
          (hasEdgeCue && borderContrast >= minBorderContrast)

        if (!passesBoundaryContrast) {
          const className = candidate.className || candidate.tagName.toLowerCase()
          results.push({
            tagName: candidate.tagName.toLowerCase(),
            className: String(className),
            backgroundContrast: Number(backgroundContrast.toFixed(2)),
            borderContrast: Number(borderContrast.toFixed(2))
          })
          if (results.length >= maxBoundaryIssuesPerPage) {
            break
          }
        }
      }

      return results
    },
    {
      selector: BOUNDARY_SELECTOR,
      minBackgroundContrast: MIN_BACKGROUND_CONTRAST,
      minBorderContrast: MIN_BORDER_CONTRAST,
      minBoundaryArea: MIN_BOUNDARY_AREA,
      maxBoundaryIssuesPerPage: MAX_BOUNDARY_ISSUES_PER_PAGE
    }
  )

  return issues.map((issue) => ({
    path,
    theme,
    state: 'boundary',
    id: 'container-boundary-contrast',
    description: `tag=${issue.tagName} class=${issue.className} bg=${issue.backgroundContrast} border=${issue.borderContrast}`
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
          const boundaryIssues = await collectBoundaryIssues(page, path, theme)
          const issues = await collectStateIssues(page, path, theme)
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
