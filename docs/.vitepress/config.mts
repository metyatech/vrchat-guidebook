import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const siteTitle = "VRChat Guidebook";
const siteDescription = "VRChat の操作・改変・ワールド制作の情報をまとめるガイドサイト";
const siteUrl = process.env.SITE_URL || "https://metyatech.github.io";
const siteBase = process.env.SITE_BASE || "/vrchat-guidebook/";

export default withMermaid({
  ...defineConfig({
    lang: "ja-JP",
    base: siteBase,
    sitemap: {
      hostname: siteUrl
    },
    title: siteTitle,
    description: siteDescription,
    head: [
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:locale", content: "ja_JP" }],
      ["meta", { property: "og:site_name", content: siteTitle }],
      ["meta", { name: "twitter:card", content: "summary" }]
    ],
    transformHead({ pageData }) {
      const title = pageData.title ? `${pageData.title} | ${siteTitle}` : siteTitle;
      const description = pageData.description || siteDescription;
      const relativePath = pageData.relativePath
        .replace(/index\.md$/, "")
        .replace(/\.md$/, ".html");
      const pageUrl = `${siteUrl}${siteBase}${relativePath}`;

      return [
        ["meta", { property: "og:title", content: title }],
        ["meta", { property: "og:description", content: description }],
        ["meta", { property: "og:url", content: pageUrl }],
        ["meta", { name: "twitter:title", content: title }],
        ["meta", { name: "twitter:description", content: description }]
      ];
    },
    themeConfig: {
      search: {
        provider: "local"
      },
      nav: [
        { text: "ホーム", link: "/" },
        { text: "操作説明", link: "/controls/" },
        { text: "改変のやり方", link: "/avatar-customization/" },
        { text: "ワールドの作り方", link: "/world-creation/" }
      ],
      sidebar: [
        {
          text: "ガイド",
          items: [
            { text: "はじめに", link: "/" },
            { text: "操作説明", link: "/controls/" },
            { text: "ポータブル自動生成", link: "/controls/automation-portable" },
            { text: "改変のやり方", link: "/avatar-customization/" },
            { text: "PhysBone: 伸びるパーツ調整", link: "/avatar-customization/physbone/" },
            {
              text: "伸びるパーツ調整手順",
              link: "/avatar-customization/physbone/stretchable-parts-workflow"
            },
            {
              text: "Stretch & Squish パラメータ",
              link: "/avatar-customization/physbone/stretch-and-squish-parameters"
            },
            {
              text: "Play Mode での伸び確認",
              link: "/avatar-customization/physbone/playmode-stretch-test"
            },
            { text: "ワールドの作り方", link: "/world-creation/" }
          ]
        }
      ],
      socialLinks: [{ icon: "github", link: "https://github.com/metyatech" }]
    }
  }),
  mermaid: {}
});
