"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { compileMatrix } = require("./lib/compiler.cjs");
const { runCompiledJobs } = require("./lib/runner.cjs");

function toPosixPath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function loadJsonFilesByKey({
  dirPath,
  keyField,
  suffixFilter = ".json",
}) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const map = {};

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(suffixFilter)) {
      continue;
    }
    const filePath = path.join(dirPath, entry.name);
    const parsed = await readJsonFile(filePath);
    const key = parsed[keyField];
    if (typeof key !== "string" || key.trim() === "") {
      throw new Error(`${filePath} must contain "${keyField}".`);
    }
    if (map[key]) {
      throw new Error(`duplicate ${keyField} "${key}" in ${dirPath}.`);
    }
    map[key] = parsed;
  }

  return map;
}

function scaffoldProfileTemplate({ profileId, name, target }) {
  if (target !== "unity" && target !== "web") {
    throw new Error(`target must be "unity" or "web", got "${target}".`);
  }

  const base = {
    schema_version: "1.0.0",
    profile_id: profileId,
    name,
    target,
    versions: {
      unity: "",
      vrchat_sdk: "",
    },
    capabilities: {},
    variables: {},
    anchors: {},
  };

  if (target === "unity") {
    base.unity = {
      execution_mode: "attach",
      project_path: "./path/to/unity-project",
      window_hint: "Unity",
    };
    base.anchors = {
      sample_anchor: {
        x_ratio: 0.5,
        y_ratio: 0.5,
        box_width: 180,
        box_height: 48,
      },
    };
  } else {
    base.web = {
      start_url: "https://example.com",
      browser: "chrome",
    };
    base.selectors = {
      sample_button: "css:button.sample",
    };
  }

  return base;
}

async function compileFromFiles({
  matrixPath,
  profilesDir,
  blueprintsDir,
  capabilitiesPath,
  generatedScenarioDir,
  manifestPath,
  jobId,
  profileId,
  cwd = process.cwd(),
}) {
  const matrix = await readJsonFile(matrixPath);
  const profilesById = await loadJsonFilesByKey({
    dirPath: profilesDir,
    keyField: "profile_id",
    suffixFilter: ".profile.json",
  });
  const blueprintsById = await loadJsonFilesByKey({
    dirPath: blueprintsDir,
    keyField: "blueprint_id",
    suffixFilter: ".blueprint.json",
  });

  let capabilityRules = { schema_version: "1.0.0", rules: [] };
  if (capabilitiesPath) {
    capabilityRules = await readJsonFile(capabilitiesPath);
  }

  const compiled = compileMatrix({
    matrix,
    profilesById,
    blueprintsById,
    capabilityRules,
  });

  const resolvedGeneratedScenarioDir = generatedScenarioDir
    ? path.resolve(cwd, generatedScenarioDir)
    : path.resolve(cwd, "automation", "scenarios", "generated");

  const filteredJobs = compiled.jobs.filter((job) => {
    if (jobId && job.job_id !== jobId) {
      return false;
    }
    if (profileId && job.profile_id !== profileId) {
      return false;
    }
    return true;
  });

  if (filteredJobs.length === 0) {
    throw new Error(
      `no jobs matched filters (jobId=${jobId || "any"}, profileId=${
        profileId || "any"
      }).`
    );
  }

  const jobs = [];
  for (const job of filteredJobs) {
    const scenarioFilename = path.basename(job.scenario_path);
    const scenarioPath = path.join(resolvedGeneratedScenarioDir, scenarioFilename);
    await writeJsonFile(scenarioPath, job.scenario);
    jobs.push({
      ...job,
      scenario_path: toPosixPath(path.relative(cwd, scenarioPath)),
    });
  }

  const manifest = {
    matrix_id: compiled.matrix_id,
    generated_at: compiled.generated_at,
    jobs,
  };

  if (manifestPath) {
    const resolvedManifestPath = path.resolve(cwd, manifestPath);
    await writeJsonFile(resolvedManifestPath, manifest);
  }

  return manifest;
}

async function runFromFiles({
  matrixPath,
  profilesDir,
  blueprintsDir,
  capabilitiesPath,
  generatedScenarioDir,
  manifestPath,
  jobId,
  profileId,
  dryRun = false,
  recordVideo = true,
  cwd = process.cwd(),
}) {
  const compiled = await compileFromFiles({
    matrixPath,
    profilesDir,
    blueprintsDir,
    capabilitiesPath,
    generatedScenarioDir,
    manifestPath,
    jobId,
    profileId,
    cwd,
  });

  return runCompiledJobs({
    compiledMatrix: compiled,
    dryRun,
    recordVideo,
    cwd,
  });
}

function parseCliArgs(argv) {
  const [command, ...args] = argv;
  const parsed = {
    command,
  };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function requireOption(parsed, optionName) {
  const value = parsed[optionName];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`--${optionName} is required.`);
  }
  return value;
}

function parseBoolOption(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new Error(`invalid boolean option value: "${value}"`);
}

async function runCli(argv = process.argv.slice(2)) {
  const parsed = parseCliArgs(argv);
  const command = parsed.command;
  if (!command || command === "help" || command === "--help") {
    console.log(
      [
        "Usage:",
        "  node automation/portable/cli.cjs compile --matrix <path> --profiles-dir <dir> --blueprints-dir <dir> [--capabilities <path>] [--generated-scenarios <dir>] [--manifest <path>]",
        "  node automation/portable/cli.cjs run --matrix <path> --profiles-dir <dir> --blueprints-dir <dir> [--capabilities <path>] [--generated-scenarios <dir>] [--manifest <path>] [--dry-run <true|false>] [--record-video <true|false>]",
        "  node automation/portable/cli.cjs scaffold-profile --profile-id <id> --name <name> --target <unity|web> --output <path>",
      ].join("\n")
    );
    return;
  }

  if (command === "compile") {
    const manifest = await compileFromFiles({
      matrixPath: requireOption(parsed, "matrix"),
      profilesDir: requireOption(parsed, "profiles-dir"),
      blueprintsDir: requireOption(parsed, "blueprints-dir"),
      capabilitiesPath: parsed.capabilities,
      generatedScenarioDir: parsed["generated-scenarios"],
      manifestPath: parsed.manifest,
      jobId: parsed["job-id"],
      profileId: parsed["profile-id"],
    });
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (command === "run") {
    const plan = await runFromFiles({
      matrixPath: requireOption(parsed, "matrix"),
      profilesDir: requireOption(parsed, "profiles-dir"),
      blueprintsDir: requireOption(parsed, "blueprints-dir"),
      capabilitiesPath: parsed.capabilities,
      generatedScenarioDir: parsed["generated-scenarios"],
      manifestPath: parsed.manifest,
      jobId: parsed["job-id"],
      profileId: parsed["profile-id"],
      dryRun: parseBoolOption(parsed["dry-run"], false),
      recordVideo: parseBoolOption(parsed["record-video"], true),
    });
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (command === "scaffold-profile") {
    const profile = scaffoldProfileTemplate({
      profileId: requireOption(parsed, "profile-id"),
      name: requireOption(parsed, "name"),
      target: requireOption(parsed, "target"),
    });
    await writeJsonFile(requireOption(parsed, "output"), profile);
    console.log(`profile template written: ${requireOption(parsed, "output")}`);
    return;
  }

  throw new Error(`unknown command: "${command}"`);
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  compileFromFiles,
  runFromFiles,
  scaffoldProfileTemplate,
  runCli,
};
