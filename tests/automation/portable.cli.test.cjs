const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const { compileFromFiles, scaffoldProfileTemplate } = require("../../automation/portable/cli.cjs");

async function withTempDir(callback) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "portable-cli-test-"));
  try {
    await callback(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("scaffoldProfileTemplate emits deterministic profile skeleton", () => {
  const profile = scaffoldProfileTemplate({
    profileId: "akane-pc",
    name: "Akane PC",
    target: "unity"
  });

  assert.equal(profile.profile_id, "akane-pc");
  assert.equal(profile.target, "unity");
  assert.equal(profile.schema_version, "1.0.0");
  assert.equal(typeof profile.anchors, "object");
});

test("compileFromFiles writes generated scenario and manifest", async () => {
  await withTempDir(async (tmp) => {
    const profilesDir = path.join(tmp, "profiles");
    const blueprintsDir = path.join(tmp, "blueprints");
    const matrixPath = path.join(tmp, "matrix.json");
    const capabilitiesPath = path.join(tmp, "capabilities.json");
    const generatedDir = path.join(tmp, "generated");
    const manifestPath = path.join(tmp, "manifest.json");

    await fs.mkdir(profilesDir, { recursive: true });
    await fs.mkdir(blueprintsDir, { recursive: true });
    await fs.mkdir(generatedDir, { recursive: true });

    await fs.writeFile(
      path.join(profilesDir, "akane.profile.json"),
      JSON.stringify(
        {
          schema_version: "1.0.0",
          profile_id: "akane-pc",
          name: "Akane PC",
          target: "unity",
          versions: {
            vrchat_sdk: "3.7.0"
          },
          unity: {
            execution_mode: "attach",
            project_path: "./projects/akane",
            window_hint: "Unity"
          },
          anchors: {
            avatar_root: {
              x_ratio: 0.1,
              y_ratio: 0.2,
              box_width: 100,
              box_height: 60
            }
          }
        },
        null,
        2
      )
    );

    await fs.writeFile(
      path.join(blueprintsDir, "unity.blueprint.json"),
      JSON.stringify(
        {
          schema_version: "1.0.0",
          blueprint_id: "unity-core",
          name: "Unity Core",
          target: "unity",
          metadata_template: {
            target_window_hint: "{{profile.unity.window_hint}}",
            unity_execution_mode: "{{profile.unity.execution_mode}}",
            unity_project_path: "{{profile.unity.project_path}}"
          },
          steps: [
            {
              id: "pick-root",
              title: "Pick root",
              action: "click",
              params_template: {
                x_ratio: {
                  $ref: "profile.anchors.avatar_root.x_ratio"
                },
                y_ratio: {
                  $ref: "profile.anchors.avatar_root.y_ratio"
                },
                box_width: {
                  $ref: "profile.anchors.avatar_root.box_width"
                },
                box_height: {
                  $ref: "profile.anchors.avatar_root.box_height"
                }
              }
            }
          ]
        },
        null,
        2
      )
    );

    await fs.writeFile(
      matrixPath,
      JSON.stringify(
        {
          schema_version: "1.0.0",
          matrix_id: "default",
          jobs: [
            {
              job_id: "akane-unity",
              profile_id: "akane-pc",
              blueprint_id: "unity-core",
              scenario_id_template: "unity-{{profile.profile_id}}",
              scenario_path_template: "automation/scenarios/generated/akane-unity.scenario.json",
              output_dir_template: "artifacts/akane-unity",
              markdown_path_template: "docs/controls/auto-akane-unity.md"
            }
          ]
        },
        null,
        2
      )
    );

    await fs.writeFile(
      capabilitiesPath,
      JSON.stringify(
        {
          schema_version: "1.0.0",
          rules: []
        },
        null,
        2
      )
    );

    const result = await compileFromFiles({
      matrixPath,
      profilesDir,
      blueprintsDir,
      capabilitiesPath,
      generatedScenarioDir: generatedDir,
      manifestPath
    });

    assert.equal(result.jobs.length, 1);

    const scenarioFile = path.join(generatedDir, "akane-unity.scenario.json");
    const scenarioRaw = await fs.readFile(scenarioFile, "utf8");
    const scenario = JSON.parse(scenarioRaw);
    assert.equal(scenario.schema_version, "2.0.0");
    assert.equal(scenario.scenario_id, "unity-akane-pc");
    assert.equal(scenario.steps.length, 1);
    assert.equal(scenario.steps[0].kind, "action");

    const manifestRaw = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);
    assert.equal(manifest.jobs.length, 1);
    assert.equal(manifest.jobs[0].job_id, "akane-unity");
  });
});

test("compileFromFiles supports job filtering", async () => {
  await withTempDir(async (tmp) => {
    const profilesDir = path.join(tmp, "profiles");
    const blueprintsDir = path.join(tmp, "blueprints");
    const matrixPath = path.join(tmp, "matrix.json");
    const capabilitiesPath = path.join(tmp, "capabilities.json");
    const generatedDir = path.join(tmp, "generated");

    await fs.mkdir(profilesDir, { recursive: true });
    await fs.mkdir(blueprintsDir, { recursive: true });
    await fs.mkdir(generatedDir, { recursive: true });

    await fs.writeFile(
      path.join(profilesDir, "unity.profile.json"),
      JSON.stringify(
        {
          schema_version: "1.0.0",
          profile_id: "unity-default",
          name: "Unity Default",
          target: "unity",
          versions: {
            vrchat_sdk: "3.7.0"
          },
          unity: {
            execution_mode: "attach",
            project_path: "./projects/unity",
            window_hint: "Unity"
          },
          anchors: {
            base: {
              x_ratio: 0.1,
              y_ratio: 0.2,
              box_width: 100,
              box_height: 60
            }
          }
        },
        null,
        2
      )
    );

    await fs.writeFile(
      path.join(profilesDir, "web.profile.json"),
      JSON.stringify(
        {
          schema_version: "1.0.0",
          profile_id: "web-default",
          name: "Web Default",
          target: "web",
          web: {
            start_url: "https://example.com",
            browser: "chrome"
          },
          selectors: {
            main: "css:a"
          }
        },
        null,
        2
      )
    );

    await fs.writeFile(
      path.join(blueprintsDir, "unity.blueprint.json"),
      JSON.stringify(
        {
          schema_version: "1.0.0",
          blueprint_id: "unity-core",
          name: "Unity Core",
          target: "unity",
          metadata_template: {
            target_window_hint: "{{profile.unity.window_hint}}",
            unity_execution_mode: "{{profile.unity.execution_mode}}",
            unity_project_path: "{{profile.unity.project_path}}"
          },
          steps: [
            {
              id: "pick-root",
              title: "Pick root",
              action: "click",
              params_template: {
                x_ratio: {
                  $ref: "profile.anchors.base.x_ratio"
                },
                y_ratio: {
                  $ref: "profile.anchors.base.y_ratio"
                },
                box_width: {
                  $ref: "profile.anchors.base.box_width"
                },
                box_height: {
                  $ref: "profile.anchors.base.box_height"
                }
              }
            }
          ]
        },
        null,
        2
      )
    );

    await fs.writeFile(
      path.join(blueprintsDir, "web.blueprint.json"),
      JSON.stringify(
        {
          schema_version: "1.0.0",
          blueprint_id: "web-core",
          name: "Web Core",
          target: "web",
          metadata_template: {
            start_url: "{{profile.web.start_url}}",
            browser: "{{profile.web.browser}}"
          },
          steps: [
            {
              id: "open",
              title: "Open",
              action: "open_url",
              params_template: {
                url: "{{profile.web.start_url}}"
              }
            }
          ]
        },
        null,
        2
      )
    );

    await fs.writeFile(
      matrixPath,
      JSON.stringify(
        {
          schema_version: "1.0.0",
          matrix_id: "default",
          jobs: [
            {
              job_id: "unity-job",
              profile_id: "unity-default",
              blueprint_id: "unity-core",
              scenario_path_template: "automation/scenarios/generated/unity.scenario.json",
              output_dir_template: "artifacts/unity",
              markdown_path_template: "docs/controls/auto-unity.md"
            },
            {
              job_id: "web-job",
              profile_id: "web-default",
              blueprint_id: "web-core",
              scenario_path_template: "automation/scenarios/generated/web.scenario.json",
              output_dir_template: "artifacts/web",
              markdown_path_template: "docs/controls/auto-web.md"
            }
          ]
        },
        null,
        2
      )
    );

    await fs.writeFile(
      capabilitiesPath,
      JSON.stringify(
        {
          schema_version: "1.0.0",
          rules: []
        },
        null,
        2
      )
    );

    const result = await compileFromFiles({
      matrixPath,
      profilesDir,
      blueprintsDir,
      capabilitiesPath,
      generatedScenarioDir: generatedDir,
      jobId: "unity-job"
    });

    assert.equal(result.jobs.length, 1);
    assert.equal(result.jobs[0].job_id, "unity-job");
    const files = await fs.readdir(generatedDir);
    assert.deepEqual(files, ["unity.scenario.json"]);
    const raw = await fs.readFile(path.join(generatedDir, "unity.scenario.json"), "utf8");
    const scenario = JSON.parse(raw);
    assert.equal(scenario.schema_version, "2.0.0");
  });
});
