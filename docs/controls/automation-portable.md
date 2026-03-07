# ポ�Eタブル自動生成ワークフロー

こ�Eペ�Eジでは、アバター差し替えや Unity /
SDK 更新が発生しても、手頁E��・画像�E動画を�E利用可能な形で再生成する方法を説明します、E

## 設計方釁E

- `profile`: アバター固有�E状態（�Eロジェクトパス、バージョン、座標アンカー�E�E-
  `blueprint`: 共通手頁E��ジチE���E�何をするか！E-
  `matrix`: どの profile と blueprint を絁E��合わせるぁE-
  `capability rules`: バ�Eジョン条件に応じた手頁E�E岁Eこれにより、手頁E��斁E��
  profile ごとに作り直さずに済みます、E

## ファイル配置

- `automation/portable/profiles/*.profile.json`
- `automation/portable/blueprints/*.blueprint.json`
- `automation/portable/matrices/*.matrix.json`
- `automation/portable/capabilities/*.json`

## 基本コマンチE

```bash
npm run guide:portable:compile
npm run guide:portable:run
```

`dry-run` で実行計画だけを確認する場吁E

```bash
npm run guide:portable:run:dry
```

## 新しいアバターを追加する手頁E

1. profile チE��プレートを生�Eする、E

```bash
node automation/portable/cli.cjs scaffold-profile --profile-id PROFILE_ID --name "DISPLAY_NAME" --target unity --output automation/portable/profiles/PROFILE_ID.profile.json
```

1. 生�Eした profile に以下を入力する、E

- `unity.project_path`
- `versions.unity`, `versions.vrchat_sdk`
- `anchors`�E�EI 位置の再利用点�E�E

1. `automation/portable/matrices/default.matrix.json` に job を追加する、E
1. `npm run guide:portable:run` で再生成する、E

## 部刁E��新

特宁Ejob のみ再生成する場吁E

```bash
node automation/portable/cli.cjs run --matrix automation/portable/matrices/default.matrix.json --profiles-dir automation/portable/profiles --blueprints-dir automation/portable/blueprints --capabilities automation/portable/capabilities/default.capabilities.json --generated-scenarios automation/scenarios/generated --manifest artifacts/portable/compile-manifest.json --job-id unity-editor-basic
```

## 注意点

- `automation/scenarios/generated/` は生�E物です。手動編雁E��ません、E- 実行時エラーは profile の
  `anchors` / `selectors` / `versions` を優先して見直します、E
