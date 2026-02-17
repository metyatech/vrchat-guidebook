# ポータブル自動生成ワークフロー

このページでは、アバター差し替えや Unity / SDK 更新が発生しても、手順書・画像・動画を再利用可能な形で再生成する方法を説明します。

## 設計方針

- `profile`: アバター固有の状態（プロジェクトパス、バージョン、座標アンカー）
- `blueprint`: 共通手順ロジック（何をするか）
- `matrix`: どの profile と blueprint を組み合わせるか
- `capability rules`: バージョン条件に応じた手順分岐

これにより、手順本文を profile ごとに作り直さずに済みます。

## ファイル配置

- `automation/portable/profiles/*.profile.json`
- `automation/portable/blueprints/*.blueprint.json`
- `automation/portable/matrices/*.matrix.json`
- `automation/portable/capabilities/*.json`

## 基本コマンド

```bash
npm run guide:portable:compile
npm run guide:portable:run
```

`dry-run` で実行計画だけを確認する場合:

```bash
npm run guide:portable:run:dry
```

## 新しいアバターを追加する手順

1. profile テンプレートを生成する。

```bash
node automation/portable/cli.cjs scaffold-profile --profile-id PROFILE_ID --name "DISPLAY_NAME" --target unity --output automation/portable/profiles/PROFILE_ID.profile.json
```

2. 生成した profile に以下を入力する。

- `unity.project_path`
- `versions.unity`, `versions.vrchat_sdk`
- `anchors`（UI 位置の再利用点）

3. `automation/portable/matrices/default.matrix.json` に job を追加する。

4. `npm run guide:portable:run` で再生成する。

## 部分更新

特定 job のみ再生成する場合:

```bash
node automation/portable/cli.cjs run --matrix automation/portable/matrices/default.matrix.json --profiles-dir automation/portable/profiles --blueprints-dir automation/portable/blueprints --capabilities automation/portable/capabilities/default.capabilities.json --generated-scenarios automation/scenarios/generated --manifest artifacts/portable/compile-manifest.json --job-id unity-editor-basic
```

## 注意点

- `automation/scenarios/generated/` は生成物です。手動編集しません。
- 実行時エラーは profile の `anchors` / `selectors` / `versions` を優先して見直します。
