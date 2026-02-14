const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests/a11y',
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:4175',
    viewport: { width: 1280, height: 720 }
  }
})
