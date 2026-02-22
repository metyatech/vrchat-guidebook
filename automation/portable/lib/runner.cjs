"use strict";

const path = require("node:path");
const { spawn } = require("node:child_process");

function buildRunPlan({ compiledMatrix, recordVideo = true }) {
  if (!compiledMatrix || !Array.isArray(compiledMatrix.jobs)) {
    throw new Error("compiledMatrix.jobs is required.");
  }

  const flag = recordVideo ? "true" : "false";
  return compiledMatrix.jobs.map((job) => ({
    job_id: job.job_id,
    args: [
      "run-scenario",
      "--scenario",
      job.scenario_path,
      "--output",
      job.output_dir,
      "--markdown",
      job.markdown_path,
      "--record-video",
      flag
    ]
  }));
}

function buildStudioInvocation({ cwd, args }) {
  const cliPath = path.join(
    cwd,
    "node_modules",
    "@metyatech",
    "automation-scenario-studio",
    "dist",
    "src",
    "cli.js"
  );
  return {
    command: process.execPath,
    args: [cliPath, ...args]
  };
}

async function spawnStudioCommand(entry, cwd) {
  const invocation = buildStudioInvocation({
    cwd,
    args: entry.args
  });
  await new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      stdio: "inherit",
      shell: false
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(`automation-scenario failed for job "${entry.job_id}" with exit code ${code}.`)
      );
    });
  });
}

async function runCompiledJobs({
  compiledMatrix,
  dryRun = false,
  recordVideo = true,
  executeCommand = spawnStudioCommand,
  cwd = process.cwd()
}) {
  const plan = buildRunPlan({
    compiledMatrix,
    recordVideo
  });

  if (dryRun) {
    return plan;
  }

  for (const entry of plan) {
    await executeCommand(entry, cwd);
  }
  return plan;
}

module.exports = {
  buildRunPlan,
  buildStudioInvocation,
  runCompiledJobs,
  spawnStudioCommand
};
