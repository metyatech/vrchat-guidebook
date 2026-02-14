# vrchat-guidebook

VRChat に関する情報をまとめる日本語ガイドサイトです。

## 構成

- `docs/controls/`: 操作説明
- `docs/avatar-customization/`: 改変のやり方
- `docs/world-creation/`: ワールドの作り方

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run docs:dev
```

## ビルド

```bash
npm run docs:build
```

## アクセシビリティチェック

```bash
npm run lint:a11y
```

`sitemap.xml` を基準に全ページを `pa11y-ci` で自動走査します。

```bash
npm run lint:contrast
```

`Playwright + axe-core` で `light/dark` 両モードと `default/hover/focus` のコントラストを自動検査します。

## 自動手順書生成

このリポジトリでは、`@metyatech/guidebook-automation-core` を使って操作手順書（Markdown + スクリーンショット + 動画）を自動生成できます。

### シナリオ

- `automation/scenarios/web-example.yaml`: Playwright で Web 操作を実行
- `automation/scenarios/unity-editor-basic.yaml`: command driver 経由で Unity 用フローを実行

### 実行コマンド

```bash
npm run guide:build:web
npm run guide:build:unity
npm run guide:build
```

### 部分更新

```bash
npm run guide:run -- --scenario automation/scenarios/web-example.yaml --only click-more-info --output artifacts/web-example --markdown docs/controls/auto-web-example.md
```

### 生成先

- `docs/controls/auto-web-example.md`
- `docs/controls/auto-unity-editor-basic.md`
- `artifacts/<scenario>/...`（画像・動画・steps.json）

> `unity-editor-basic` はテンプレート実装です。実運用では `automation/scenarios/unity-editor-basic.yaml` の `command` を、Robot Framework / pywinauto などの実際の Unity Editor 操作スクリプトに置き換えてください。

## 検証

```bash
npm run verify
```

## プレビュー

```bash
npm run docs:preview
```
