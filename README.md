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

## 検証

```bash
npm run verify
```

## プレビュー

```bash
npm run docs:preview
```
