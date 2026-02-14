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

このリポジトリでは、`@metyatech/automation-scenario-studio` を使って操作手順書（Markdown + スクリーンショット + 動画）を自動生成できます。

仕様と責務は以下の分離リポジトリに切り出しています。

- `metyatech/automation-scenario-renderer`: Markdown/画像/動画生成
- `metyatech/automation-scenario-studio`: CLI/運用入口
- `metyatech/robotframework-unity-editor`: Unity Editor 操作用 Robot Framework ライブラリ

### シナリオ

- `automation/robot/web-example.robot`: Robot Framework で Web 操作を実行
- `automation/robot/unity-editor-basic.robot`: Robot Framework から Unity Editor 実機フローを実行

注釈は Robot キーワード側で共通化しています（`automation/robot/resources/doc_keywords.resource`）。
現状は `click` と `dragDrop` を扱い、将来的にテキストラベル等を追加できる構成です。

### 実行コマンド

```bash
npm run guide:build:web
npm run guide:build:unity
npm run guide:build
```

Robot + Unity 側の前提セットアップ:

```bash
python -m pip install -r automation/robot/requirements.txt
```

必要に応じて Unity 実行ファイルを固定する場合は `UNITY_EDITOR_EXE` を設定してください。

### 部分更新

```bash
npm run guide:run -- --suite automation/robot/web-example.robot --output artifacts/web-example --markdown docs/controls/auto-web-example.md
```

### 生成先

- `docs/controls/auto-web-example.md`
- `docs/controls/auto-unity-editor-basic.md`
- `artifacts/<scenario>/...`（画像・動画・steps.json）

## 検証

```bash
npm run verify
```

## プレビュー

```bash
npm run docs:preview
```
