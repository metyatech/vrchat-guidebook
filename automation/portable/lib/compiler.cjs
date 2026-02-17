"use strict";

const path = require("node:path");
const {
  validateProfile,
  validateBlueprint,
  validateMatrix,
} = require("./contracts.cjs");
const { evaluateCondition, getPathValue } = require("./conditions.cjs");

function sanitizeId(input) {
  return String(input)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function interpolateString(template, context) {
  if (typeof template !== "string") {
    return template;
  }
  const matcher = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  return template.replace(matcher, (_, tokenPath) => {
    const value = getPathValue(context, tokenPath);
    if (value === undefined || value === null) {
      throw new Error(`missing required reference "${tokenPath}"`);
    }
    return String(value);
  });
}

function resolveTemplateValue(value, context) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplateValue(item, context));
  }
  if (typeof value === "string") {
    return interpolateString(value, context);
  }
  if (value && typeof value === "object") {
    if (typeof value.$ref === "string") {
      const resolved = getPathValue(context, value.$ref);
      if (resolved === undefined || resolved === null) {
        throw new Error(`missing required reference "${value.$ref}"`);
      }
      return resolved;
    }
    if (typeof value.$template === "string") {
      return interpolateString(value.$template, context);
    }
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = resolveTemplateValue(nested, context);
    }
    return output;
  }
  return value;
}

function createCapabilities(profile, capabilityRules, baseContext) {
  const fromRules = {};
  const rules = Array.isArray(capabilityRules && capabilityRules.rules)
    ? capabilityRules.rules
    : [];

  for (const rule of rules) {
    if (!rule || typeof rule !== "object") {
      continue;
    }
    if (typeof rule.capability !== "string" || rule.capability.trim() === "") {
      continue;
    }
    const matched = evaluateCondition(rule.when, {
      ...baseContext,
      capabilities: {
        ...fromRules,
      },
    });
    if (matched) {
      fromRules[rule.capability] = true;
    }
  }

  return {
    ...fromRules,
    ...(profile.capabilities || {}),
  };
}

function compileJob({ job, profile, blueprint, matrix, capabilityRules }) {
  if (profile.target !== blueprint.target) {
    throw new Error(
      `target mismatch for job "${job.job_id}": profile is "${profile.target}" but blueprint is "${blueprint.target}".`
    );
  }

  const baseContext = {
    matrix,
    job,
    profile,
    blueprint,
  };
  const capabilities = createCapabilities(profile, capabilityRules, baseContext);
  const context = {
    ...baseContext,
    capabilities,
  };

  const steps = [];
  for (const step of blueprint.steps) {
    if (!evaluateCondition(step.when, context)) {
      continue;
    }
    const params = resolveTemplateValue(step.params_template, context);
    steps.push({
      id: interpolateString(step.id, context),
      title: interpolateString(step.title, context),
      description:
        step.description !== undefined
          ? interpolateString(step.description, context)
          : "",
      action: step.action,
      params,
    });
  }

  const scenarioId = sanitizeId(
    job.scenario_id_template
      ? interpolateString(job.scenario_id_template, context)
      : `${blueprint.blueprint_id}-${profile.profile_id}`
  );
  const scenarioName = job.scenario_name_template
    ? interpolateString(job.scenario_name_template, context)
    : `${blueprint.name} - ${profile.name}`;

  const scenarioPath = interpolateString(
    job.scenario_path_template ||
      path.join("automation", "scenarios", "generated", `${scenarioId}.scenario.json`),
    {
      ...context,
      scenario: { id: scenarioId, name: scenarioName },
    }
  );

  const outputDir = job.output_dir_template
    ? interpolateString(job.output_dir_template, context)
    : path.join("artifacts", scenarioId);
  const markdownPath = job.markdown_path_template
    ? interpolateString(job.markdown_path_template, context)
    : path.join("docs", "controls", `auto-${scenarioId}.md`);

  return {
    job_id: job.job_id,
    profile_id: profile.profile_id,
    blueprint_id: blueprint.blueprint_id,
    capabilities,
    scenario_path: scenarioPath,
    output_dir: outputDir,
    markdown_path: markdownPath,
    scenario: {
      schema_version: "1.0.0",
      scenario_id: scenarioId,
      name: scenarioName,
      target: blueprint.target,
      metadata: resolveTemplateValue(blueprint.metadata_template, context),
      steps,
    },
  };
}

function compileMatrix({
  matrix,
  profilesById,
  blueprintsById,
  capabilityRules = { schema_version: "1.0.0", rules: [] },
}) {
  validateMatrix(matrix);

  const jobs = matrix.jobs.map((job) => {
    const profile = profilesById[job.profile_id];
    const blueprint = blueprintsById[job.blueprint_id];

    if (!profile) {
      throw new Error(
        `profile "${job.profile_id}" referenced by job "${job.job_id}" was not found.`
      );
    }
    if (!blueprint) {
      throw new Error(
        `blueprint "${job.blueprint_id}" referenced by job "${job.job_id}" was not found.`
      );
    }

    validateProfile(profile);
    validateBlueprint(blueprint);

    return compileJob({
      job,
      profile,
      blueprint,
      matrix,
      capabilityRules,
    });
  });

  return {
    matrix_id: matrix.matrix_id,
    generated_at: new Date().toISOString(),
    jobs,
  };
}

module.exports = {
  compileMatrix,
  interpolateString,
  resolveTemplateValue,
};
