const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateProfile,
  validateBlueprint,
  validateMatrix,
} = require("../../automation/portable/lib/contracts.cjs");

test("validateProfile accepts a valid unity profile", () => {
  const profile = {
    schema_version: "1.0.0",
    profile_id: "alice-pc",
    name: "Alice PC Profile",
    target: "unity",
    versions: {
      unity: "2022.3.22f1",
      vrchat_sdk: "3.7.0",
    },
    capabilities: {
      supports_control_panel: true,
    },
    unity: {
      execution_mode: "attach",
      project_path: "./projects/alice",
      window_hint: "Unity",
    },
    anchors: {
      hierarchy_avatar_root: {
        x_ratio: 0.2,
        y_ratio: 0.4,
        box_width: 180,
        box_height: 48,
      },
    },
  };

  assert.doesNotThrow(() => validateProfile(profile));
});

test("validateBlueprint rejects mismatched target", () => {
  const blueprint = {
    schema_version: "1.0.0",
    blueprint_id: "unity-core",
    name: "Unity Core",
    target: "unity",
    metadata_template: {},
    steps: [
      {
        id: "open",
        title: "Open",
        action: "open_url",
        params_template: {
          url: "https://example.com",
        },
      },
    ],
  };

  assert.throws(
    () => validateBlueprint(blueprint),
    /unsupported action "open_url" for target "unity"/i
  );
});

test("validateMatrix requires at least one job", () => {
  const matrix = {
    schema_version: "1.0.0",
    matrix_id: "default",
    jobs: [],
  };

  assert.throws(
    () => validateMatrix(matrix),
    /must contain at least one job/i
  );
});
