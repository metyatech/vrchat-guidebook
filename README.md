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

## Portable automation for guide generation

This repository uses a profile-driven portable automation layer on top of `@metyatech/automation-scenario-studio`.

The portability model separates concerns into four data types:

- `automation/portable/profiles/*.profile.json`: avatar/project-specific state (paths, versions, selectors, anchors)
- `automation/portable/blueprints/*.blueprint.json`: reusable operation logic without avatar-specific values
- `automation/portable/matrices/*.matrix.json`: execution mapping for profile x blueprint combinations
- `automation/portable/capabilities/*.json`: version-aware capability rules for conditional steps

The compiler resolves templates and conditions into deterministic generated scenarios under `automation/scenarios/generated/`.
Those scenarios are emitted as `automation-scenario` schema `2.0.0` and then executed to regenerate markdown, screenshots, videos, and `steps.json`.
Blueprint steps can be authored either as compact `action + params_template` entries or full `step_template` objects for control/group structures.

### Portable commands

```bash
npm run guide:portable:compile
npm run guide:portable:run
npm run guide:portable:run:dry
npm run guide:build:web
npm run guide:build:unity
npm run guide:build
```

Prerequisites for Robot + Unity automation:

```bash
python -m pip install -r automation/requirements.txt
```

If needed, pin Unity executable path via `UNITY_EDITOR_EXE`.

### End-to-end example

```bash
node automation/portable/cli.cjs run \
  --matrix automation/portable/matrices/default.matrix.json \
  --profiles-dir automation/portable/profiles \
  --blueprints-dir automation/portable/blueprints \
  --capabilities automation/portable/capabilities/default.capabilities.json \
  --generated-scenarios automation/scenarios/generated \
  --manifest artifacts/portable/compile-manifest.json \
  --job-id unity-editor-basic \
  --record-video true
```

### CLI reference (`automation/portable/cli.cjs`)

Command: `compile`

- `--matrix` (required): matrix JSON path
- `--profiles-dir` (required): profile directory path
- `--blueprints-dir` (required): blueprint directory path
- `--capabilities` (optional): capability rules JSON path
- `--generated-scenarios` (optional): generated scenario output directory
- `--manifest` (optional): compile manifest output path
- `--job-id` (optional): compile only one matrix job
- `--profile-id` (optional): compile only jobs with the profile id

Command: `run`

- All `compile` parameters
- `--dry-run` (optional): `true` or `false` (default: `false`)
- `--record-video` (optional): `true` or `false` (default: `true`)

Command: `scaffold-profile`

- `--profile-id` (required): output profile id
- `--name` (required): human-readable profile name
- `--target` (required): `unity` or `web`
- `--output` (required): output file path

### Outputs

- `docs/controls/auto-web-example.md`
- `docs/controls/auto-unity-editor-basic.md`
- `artifacts/<scenario>/...` (images, videos, `steps.json`)
- `artifacts/portable/compile-manifest.json`

## 検証

```bash
npm run verify
```

## プレビュー

```bash
npm run docs:preview
```
