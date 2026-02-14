import { defineConfig } from 'vitepress'

const siteUrl = process.env.SITE_URL || 'https://metyatech.github.io'
const siteBase = process.env.SITE_BASE || '/vrchat-guidebook/'

export default defineConfig({
  lang: 'ja-JP',
  base: siteBase,
  sitemap: {
    hostname: siteUrl
  },
  title: 'VRChat Guidebook',
  description: 'VRChat の操作・改変・ワールド制作の情報をまとめるガイドサイト',
  themeConfig: {
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'ホーム', link: '/' },
      { text: '操作説明', link: '/controls/' },
      { text: '改変のやり方', link: '/avatar-customization/' },
      { text: 'ワールドの作り方', link: '/world-creation/' }
    ],
    sidebar: [
      {
        text: 'ガイド',
        items: [
          { text: 'はじめに', link: '/' },
          { text: '操作説明', link: '/controls/' },
          { text: '改変のやり方', link: '/avatar-customization/' },
          { text: 'ワールドの作り方', link: '/world-creation/' }
        ]
      }
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/metyatech' }]
  }
})
