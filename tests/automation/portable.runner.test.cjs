const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRunPlan,
  runCompiledJobs,
  buildStudioInvocation,
} = require("../../automation/portable/lib/runner.cjs");

function sampleCompiledMatrix() {
  return {
    matrix_id: "default",
    generated_at: "2026-02-17T00:00:00.000Z",
    jobs: [
      {
        job_id: "unity-job",
        scenario_path: "automation/scenarios/generated/unity-job.scenario.json",
        output_dir: "artifacts/unity-job",
        markdown_path: "docs/controls/auto-unity-job.md",
      },
      {
        job_id: "web-job",
        scenario_path: "automation/scenarios/generated/web-job.scenario.json",
        output_dir: "artifacts/web-job",
        markdown_path: "docs/controls/auto-web-job.md",
      },
    ],
  };
}

test("buildRunPlan creates deterministic command arguments", () => {
  const plan = buildRunPlan({
    compiledMatrix: sampleCompiledMatrix(),
    recordVideo: false,
  });

  assert.equal(plan.length, 2);
  assert.deepEqual(plan[0].args, [
    "run-scenario",
    "--scenario",
    "automation/scenarios/generated/unity-job.scenario.json",
    "--output",
    "artifacts/unity-job",
    "--markdown",
    "docs/controls/auto-unity-job.md",
    "--record-video",
    "false",
  ]);
});

test("runCompiledJobs dry-run does not execute command runner", async () => {
  let called = false;
  const plan = await runCompiledJobs({
    compiledMatrix: sampleCompiledMatrix(),
    dryRun: true,
    recordVideo: true,
    executeCommand: async () => {
      called = true;
    },
  });

  assert.equal(called, false);
  assert.equal(plan.length, 2);
  assert.equal(plan[0].args[8], "true");
});

test("runCompiledJobs executes all jobs in order", async () => {
  const executed = [];
  await runCompiledJobs({
    compiledMatrix: sampleCompiledMatrix(),
    dryRun: false,
    recordVideo: false,
    executeCommand: async (entry) => {
      executed.push(entry.job_id);
    },
  });

  assert.deepEqual(executed, ["unity-job", "web-job"]);
});

test("buildStudioInvocation uses node cli entrypoint instead of cmd shim", () => {
  const invocation = buildStudioInvocation({
    cwd: "D:/work/repo",
    args: ["run-scenario", "--scenario", "automation/scenarios/generated/web.scenario.json"],
  });

  assert.equal(invocation.command, process.execPath);
  assert.equal(
    invocation.args[0].replace(/\\/g, "/"),
    "D:/work/repo/node_modules/@metyatech/automation-scenario-studio/dist/src/cli.js"
  );
  assert.equal(invocation.args[1], "run-scenario");
});
