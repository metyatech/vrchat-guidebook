# Portable Automation Data Contracts

This folder documents repository-local JSON contracts used by the portable automation layer.

## Core Objects

- `profile`: avatar/project-specific state and anchors.
- `blueprint`: reusable step logic without avatar-specific coordinates/selectors.
- `matrix`: execution mapping for `profile x blueprint` combinations.
- `capability rules`: version-aware feature flags for conditional steps.

## Profile (`*.profile.json`)

Required fields:

- `schema_version`: currently `1.0.0`
- `profile_id`
- `name`
- `target`: `unity` or `web`

Common optional fields:

- `versions`: version values for Unity, VRChat SDK, or related tools.
- `capabilities`: explicit capability overrides.
- `anchors`: reusable coordinate map for desktop interactions.
- `unity`/`web`: target-specific runtime metadata.
- `variables`: free-form values referenced by blueprints.

## Blueprint (`*.blueprint.json`)

Required fields:

- `schema_version`
- `blueprint_id`
- `name`
- `target`
- `metadata_template`
- `steps[]`

Each step supports:

- `id`, `title`, `description`
- `action` + `params_template` (legacy compact form)
- `step_template` (full `automation-scenario` v2 step object, including `kind: action|group|control`)
- `when` (optional condition)

Template features:

- String interpolation: `{{profile.unity.project_path}}`
- Structured reference: `{ "$ref": "profile.anchors.main_button.x_ratio" }`

Compiled scenario output is `automation-scenario` schema `2.0.0`.
Legacy compact step actions are translated into v2 action steps (for example `drag -> drag_drop`, `menu -> open_menu`, `wait -> wait_for`).
Legacy compact params also support fallback arrays that compile into portable runtime selectors (for example `menu_path_candidates`, `hierarchy_paths`).

## Matrix (`*.matrix.json`)

Required fields:

- `schema_version`
- `matrix_id`
- `jobs[]`

Each job requires:

- `job_id`
- `profile_id`
- `blueprint_id`

Optional templates:

- `scenario_id_template`
- `scenario_name_template`
- `scenario_path_template`
- `output_dir_template`
- `markdown_path_template`

## Capability Rules

`capability rules` are evaluated against each profile context.

Supported conditions:

- `all`, `any`, `not`
- `capability`
- `equals`
- `exists`
- `version_gte`, `version_gt`, `version_lte`, `version_lt`

If a rule condition matches, its `capability` becomes `true` unless overridden by `profile.capabilities`.
