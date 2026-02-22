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
      vrchat_sdk: "3.7.0"
    },
    capabilities: {
      supports_legacy_panel: false
    },
    unity: {
      execution_mode: "attach",
      project_path: "./projects/alice",
      window_hint: "Unity"
    },
    anchors: {
      hierarchy_avatar_root: {
        x_ratio: 0.2,
        y_ratio: 0.4,
        box_width: 180,
        box_height: 48
      },
      inspector_expression_foldout: {
        x_ratio: 0.64,
        y_ratio: 0.47,
        box_width: 220,
        box_height: 48
      }
    }
  };

  const blueprint = {
    schema_version: "1.0.0",
    blueprint_id: "unity-avatar-core",
    name: "Unity Avatar Core",
    target: "unity",
    metadata_template: {
      target_window_hint: "{{profile.unity.window_hint}}",
      unity_execution_mode: "{{profile.unity.execution_mode}}",
      unity_project_path: "{{profile.unity.project_path}}"
    },
    steps: [
      {
        id: "select-avatar-root",
        title: "Select avatar root",
        description: "Select avatar root object in hierarchy.",
        action: "click",
        params_template: {
          x_ratio: {
            $ref: "profile.anchors.hierarchy_avatar_root.x_ratio"
          },
          y_ratio: {
            $ref: "profile.anchors.hierarchy_avatar_root.y_ratio"
          },
          box_width: {
            $ref: "profile.anchors.hierarchy_avatar_root.box_width"
          },
          box_height: {
            $ref: "profile.anchors.hierarchy_avatar_root.box_height"
          },
          wait_seconds: 0.8
        }
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
                value: "3.6.0"
              }
            },
            {
              capability: "supports_control_panel"
            }
          ]
        },
        params_template: {
          x_ratio: {
            $ref: "profile.anchors.inspector_expression_foldout.x_ratio"
          },
          y_ratio: {
            $ref: "profile.anchors.inspector_expression_foldout.y_ratio"
          },
          box_width: {
            $ref: "profile.anchors.inspector_expression_foldout.box_width"
          },
          box_height: {
            $ref: "profile.anchors.inspector_expression_foldout.box_height"
          },
          wait_seconds: 0.8
        }
      },
      {
        id: "legacy-panel-step",
        title: "Legacy panel",
        description: "Legacy-only step.",
        action: "wait",
        when: {
          capability: "supports_legacy_panel"
        },
        params_template: {
          seconds: 1
        }
      }
    ]
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
        scenario_path_template: "automation/scenarios/generated/{{job.job_id}}.scenario.json",
        output_dir_template: "artifacts/{{profile.profile_id}}",
        markdown_path_template: "docs/controls/auto-{{profile.profile_id}}.md"
      }
    ]
  };

  const capabilityRules = {
    schema_version: "1.0.0",
    rules: [
      {
        capability: "supports_control_panel",
        when: {
          version_gte: {
            path: "profile.versions.vrchat_sdk",
            value: "3.6.0"
          }
        }
      },
      {
        capability: "supports_legacy_panel",
        when: {
          version_lt: {
            path: "profile.versions.vrchat_sdk",
            value: "3.6.0"
          }
        }
      }
    ]
  };

  return { profile, blueprint, matrix, capabilityRules };
}

test("compileMatrix resolves templates and conditionally includes steps", () => {
  const { profile, blueprint, matrix, capabilityRules } = buildFixture();
  const compiled = compileMatrix({
    matrix,
    profilesById: {
      [profile.profile_id]: profile
    },
    blueprintsById: {
      [blueprint.blueprint_id]: blueprint
    },
    capabilityRules
  });

  assert.equal(compiled.jobs.length, 1);
  const [job] = compiled.jobs;
  assert.equal(job.scenario.schema_version, "2.0.0");
  assert.equal(job.scenario.scenario_id, "unity-alice-pc");
  assert.equal(job.scenario.target, "unity");
  assert.equal(job.scenario.steps.length, 2);
  assert.equal(job.scenario.steps[0].kind, "action");
  assert.equal(job.scenario.steps[0].action, "click");
  assert.equal(job.scenario.steps[0].target.strategy, "coordinate");
  assert.equal(job.scenario.steps[1].id, "open-control-panel");
  assert.equal(job.scenario.steps[1].timing.stability_ms, 800);
  assert.equal(job.scenario.metadata.unity_project_path, "./projects/alice");
});

test("compileMatrix throws on missing references", () => {
  const { profile, blueprint, matrix, capabilityRules } = buildFixture();
  blueprint.steps[0].params_template.x_ratio = {
    $ref: "profile.anchors.unknown_anchor.x_ratio"
  };

  assert.throws(
    () =>
      compileMatrix({
        matrix,
        profilesById: {
          [profile.profile_id]: profile
        },
        blueprintsById: {
          [blueprint.blueprint_id]: blueprint
        },
        capabilityRules
      }),
    /missing required reference/i
  );
});

test("compileMatrix supports step_template for v2 control steps", () => {
  const profile = {
    schema_version: "1.0.0",
    profile_id: "akane",
    name: "Akane",
    target: "unity",
    unity: {
      execution_mode: "attach",
      project_path: "./projects/akane",
      window_hint: "Unity"
    },
    variables: {
      targets: ["Tail", "Ear_L"]
    }
  };

  const blueprint = {
    schema_version: "1.0.0",
    blueprint_id: "unity-control-v2",
    name: "Unity Control V2",
    target: "unity",
    metadata_template: {},
    steps: [
      {
        id: "loop-targets",
        title: "Loop Targets",
        step_template: {
          kind: "control",
          control: "for_each",
          items_expression: {
            $ref: "profile.variables.targets"
          },
          item_variable: "part",
          steps: [
            {
              id: "open-menu-${part}",
              title: "Open ${part} menu",
              kind: "action",
              action: "open_menu",
              input: {
                menu_path: "Tools/${part}"
              }
            }
          ]
        }
      }
    ]
  };

  const matrix = {
    schema_version: "1.0.0",
    matrix_id: "default",
    jobs: [
      {
        job_id: "unity-control-job",
        profile_id: "akane",
        blueprint_id: "unity-control-v2"
      }
    ]
  };

  const compiled = compileMatrix({
    matrix,
    profilesById: { akane: profile },
    blueprintsById: { "unity-control-v2": blueprint },
    capabilityRules: { schema_version: "1.0.0", rules: [] }
  });

  const step = compiled.jobs[0].scenario.steps[0];
  assert.equal(step.kind, "control");
  assert.equal(step.control, "for_each");
  assert.deepEqual(step.items_expression, ["Tail", "Ear_L"]);
  assert.equal(step.steps[0].input.menu_path, "Tools/${part}");
});

test("compileMatrix maps legacy candidates to runtime fallback selectors", () => {
  const profile = {
    schema_version: "1.0.0",
    profile_id: "portable",
    name: "Portable",
    target: "unity",
    unity: {
      execution_mode: "attach",
      project_path: "./projects/portable",
      window_hint: "Unity"
    },
    variables: {
      hierarchy: {
        avatar_root_candidates: ["AvatarRoot", "Body/AvatarRoot", "Armature/AvatarRoot"]
      }
    }
  };

  const blueprint = {
    schema_version: "1.0.0",
    blueprint_id: "unity-fallbacks",
    name: "Unity Fallbacks",
    target: "unity",
    metadata_template: {},
    steps: [
      {
        id: "open-control-panel",
        title: "Open Control Panel",
        action: "menu",
        params_template: {
          menu_path_candidates: [
            "VRChat SDK/Show Control Panel",
            "VRChat SDK/Utilities/Show Control Panel"
          ]
        }
      },
      {
        id: "select-avatar-root",
        title: "Select Avatar Root",
        action: "select_hierarchy",
        params_template: {
          hierarchy_paths: {
            $ref: "profile.variables.hierarchy.avatar_root_candidates"
          }
        }
      }
    ]
  };

  const matrix = {
    schema_version: "1.0.0",
    matrix_id: "default",
    jobs: [
      {
        job_id: "fallback-job",
        profile_id: "portable",
        blueprint_id: "unity-fallbacks"
      }
    ]
  };

  const compiled = compileMatrix({
    matrix,
    profilesById: { portable: profile },
    blueprintsById: { "unity-fallbacks": blueprint },
    capabilityRules: { schema_version: "1.0.0", rules: [] }
  });

  const scenarioSteps = compiled.jobs[0].scenario.steps;
  assert.equal(scenarioSteps[0].action, "open_menu");
  assert.equal(scenarioSteps[0].input.menu_path, "VRChat SDK/Show Control Panel");
  assert.deepEqual(scenarioSteps[0].input.menu_path_candidates, [
    "VRChat SDK/Show Control Panel",
    "VRChat SDK/Utilities/Show Control Panel"
  ]);

  assert.equal(scenarioSteps[1].action, "select_hierarchy");
  assert.equal(scenarioSteps[1].target.unity_hierarchy.path, "AvatarRoot");
  assert.equal(scenarioSteps[1].target.fallbacks.length, 2);
  assert.equal(scenarioSteps[1].target.fallbacks[0].unity_hierarchy.path, "Body/AvatarRoot");
});
