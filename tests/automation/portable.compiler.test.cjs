const test = require("node:test");
const assert = require("node:assert/strict");

const { compileMatrix } = require("../../automation/portable/lib/compiler.cjs");

function buildFixture() {
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
      supports_legacy_panel: false,
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
      inspector_expression_foldout: {
        x_ratio: 0.64,
        y_ratio: 0.47,
        box_width: 220,
        box_height: 48,
      },
    },
  };

  const blueprint = {
    schema_version: "1.0.0",
    blueprint_id: "unity-avatar-core",
    name: "Unity Avatar Core",
    target: "unity",
    metadata_template: {
      target_window_hint: "{{profile.unity.window_hint}}",
      unity_execution_mode: "{{profile.unity.execution_mode}}",
      unity_project_path: "{{profile.unity.project_path}}",
    },
    steps: [
      {
        id: "select-avatar-root",
        title: "Select avatar root",
        description: "Select avatar root object in hierarchy.",
        action: "click",
        params_template: {
          x_ratio: {
            $ref: "profile.anchors.hierarchy_avatar_root.x_ratio",
          },
          y_ratio: {
            $ref: "profile.anchors.hierarchy_avatar_root.y_ratio",
          },
          box_width: {
            $ref: "profile.anchors.hierarchy_avatar_root.box_width",
          },
          box_height: {
            $ref: "profile.anchors.hierarchy_avatar_root.box_height",
          },
          wait_seconds: 0.8,
        },
      },
      {
        id: "open-control-panel",
        title: "Open control panel",
        description: "Open control panel for SDK 3.6+.",
        action: "click",
        when: {
          all: [
            {
              version_gte: {
                path: "profile.versions.vrchat_sdk",
                value: "3.6.0",
              },
            },
            {
              capability: "supports_control_panel",
            },
          ],
        },
        params_template: {
          x_ratio: {
            $ref: "profile.anchors.inspector_expression_foldout.x_ratio",
          },
          y_ratio: {
            $ref: "profile.anchors.inspector_expression_foldout.y_ratio",
          },
          box_width: {
            $ref: "profile.anchors.inspector_expression_foldout.box_width",
          },
          box_height: {
            $ref: "profile.anchors.inspector_expression_foldout.box_height",
          },
          wait_seconds: 0.8,
        },
      },
      {
        id: "legacy-panel-step",
        title: "Legacy panel",
        description: "Legacy-only step.",
        action: "wait",
        when: {
          capability: "supports_legacy_panel",
        },
        params_template: {
          seconds: 1,
        },
      },
    ],
  };

  const matrix = {
    schema_version: "1.0.0",
    matrix_id: "default",
    jobs: [
      {
        job_id: "alice-unity",
        profile_id: "alice-pc",
        blueprint_id: "unity-avatar-core",
        scenario_id_template: "unity-{{profile.profile_id}}",
        scenario_name_template: "Avatar Core - {{profile.name}}",
        scenario_path_template:
          "automation/scenarios/generated/{{job.job_id}}.scenario.json",
        output_dir_template: "artifacts/{{profile.profile_id}}",
        markdown_path_template:
          "docs/controls/auto-{{profile.profile_id}}.md",
      },
    ],
  };

  const capabilityRules = {
    schema_version: "1.0.0",
    rules: [
      {
        capability: "supports_control_panel",
        when: {
          version_gte: {
            path: "profile.versions.vrchat_sdk",
            value: "3.6.0",
          },
        },
      },
      {
        capability: "supports_legacy_panel",
        when: {
          version_lt: {
            path: "profile.versions.vrchat_sdk",
            value: "3.6.0",
          },
        },
      },
    ],
  };

  return { profile, blueprint, matrix, capabilityRules };
}

test("compileMatrix resolves templates and conditionally includes steps", () => {
  const { profile, blueprint, matrix, capabilityRules } = buildFixture();
  const compiled = compileMatrix({
    matrix,
    profilesById: {
      [profile.profile_id]: profile,
    },
    blueprintsById: {
      [blueprint.blueprint_id]: blueprint,
    },
    capabilityRules,
  });

  assert.equal(compiled.jobs.length, 1);
  const [job] = compiled.jobs;
  assert.equal(job.scenario.scenario_id, "unity-alice-pc");
  assert.equal(job.scenario.target, "unity");
  assert.equal(job.scenario.steps.length, 2);
  assert.equal(job.scenario.steps[1].id, "open-control-panel");
  assert.equal(
    job.scenario.metadata.unity_project_path,
    "./projects/alice"
  );
});

test("compileMatrix throws on missing references", () => {
  const { profile, blueprint, matrix, capabilityRules } = buildFixture();
  blueprint.steps[0].params_template.x_ratio = {
    $ref: "profile.anchors.unknown_anchor.x_ratio",
  };

  assert.throws(
    () =>
      compileMatrix({
        matrix,
        profilesById: {
          [profile.profile_id]: profile,
        },
        blueprintsById: {
          [blueprint.blueprint_id]: blueprint,
        },
        capabilityRules,
      }),
    /missing required reference/i
  );
});
