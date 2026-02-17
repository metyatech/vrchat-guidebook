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

function normalizeLegacyAction(action) {
  const normalized = String(action || "").trim().toLowerCase();
  switch (normalized) {
    case "drag":
      return "drag_drop";
    case "type":
      return "type_text";
    case "wait":
      return "wait_for";
    case "keys":
    case "shortcut":
      return "press_keys";
    case "menu":
      return "open_menu";
    default:
      return normalized;
  }
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredString(params, key, stepId) {
  const value = params[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`step "${stepId}" requires params.${key} as non-empty string.`);
  }
  return value;
}

function readCoordinateTarget(params, xKey, yKey, stepId) {
  const xRatio = toFiniteNumber(params[xKey]);
  const yRatio = toFiniteNumber(params[yKey]);
  if (xRatio === undefined || yRatio === undefined) {
    throw new Error(
      `step "${stepId}" requires numeric params.${xKey} and params.${yKey}.`
    );
  }
  return {
    strategy: "coordinate",
    coordinate: {
      x_ratio: xRatio,
      y_ratio: yRatio,
    },
  };
}

function buildTiming(params) {
  const timing = {};
  const waitSeconds = toFiniteNumber(params.wait_seconds);
  if (waitSeconds !== undefined) {
    timing.stability_ms = Math.max(0, Math.round(waitSeconds * 1000));
  }
  const timeoutSeconds = toFiniteNumber(params.timeout_seconds);
  if (timeoutSeconds !== undefined) {
    timing.timeout_seconds = timeoutSeconds;
  }
  const retries = toFiniteNumber(params.retries);
  if (retries !== undefined) {
    timing.retries = Math.max(0, Math.round(retries));
  }
  return Object.keys(timing).length > 0 ? timing : undefined;
}

function pickBoxSizeInput(params) {
  const input = {};
  const boxWidth = toFiniteNumber(params.box_width);
  const boxHeight = toFiniteNumber(params.box_height);
  if (boxWidth !== undefined) {
    input.box_width = boxWidth;
  }
  if (boxHeight !== undefined) {
    input.box_height = boxHeight;
  }
  return Object.keys(input).length > 0 ? input : undefined;
}

function compileLegacyStep(step, params, context) {
  if (!isRecord(params)) {
    throw new Error(
      `step "${step.id}" params_template must resolve to an object. Received: ${typeof params}`
    );
  }

  const id = interpolateString(step.id, context);
  const title = interpolateString(step.title, context);
  const description =
    step.description !== undefined
      ? interpolateString(step.description, context)
      : undefined;
  const action = normalizeLegacyAction(step.action);
  const timing = buildTiming(params);

  const compiled = {
    id,
    title,
    kind: "action",
    action,
  };

  if (description && description.trim() !== "") {
    compiled.description = description;
  }
  if (timing) {
    compiled.timing = timing;
  }

  if (step.annotations_template !== undefined) {
    const annotations = resolveTemplateValue(step.annotations_template, context);
    if (Array.isArray(annotations) && annotations.length > 0) {
      compiled.annotations = annotations;
    }
  }

  if (action === "open_url") {
    compiled.input = {
      url: readRequiredString(params, "url", id),
    };
    return compiled;
  }

  if (action === "click" || action === "double_click" || action === "right_click") {
    compiled.target = readCoordinateTarget(params, "x_ratio", "y_ratio", id);
    const input = pickBoxSizeInput(params);
    if (input) {
      compiled.input = input;
    }
    return compiled;
  }

  if (action === "drag_drop") {
    compiled.target = readCoordinateTarget(params, "to_x_ratio", "to_y_ratio", id);
    compiled.input = {
      source: readCoordinateTarget(params, "from_x_ratio", "from_y_ratio", id),
    };
    return compiled;
  }

  if (action === "open_menu") {
    compiled.input = {
      menu_path: readRequiredString(params, "menu_path", id),
    };
    return compiled;
  }

  if (action === "select_hierarchy") {
    compiled.target = {
      strategy: "unity_hierarchy",
      unity_hierarchy: {
        path: readRequiredString(params, "hierarchy_path", id),
      },
    };
    return compiled;
  }

  if (action === "type_text") {
    const input = {};
    if (typeof params.text === "string") {
      input.text = params.text;
    }
    if (Object.keys(input).length > 0) {
      compiled.input = input;
    }
    if (
      params.x_ratio !== undefined &&
      params.y_ratio !== undefined
    ) {
      compiled.target = readCoordinateTarget(params, "x_ratio", "y_ratio", id);
      const boxInput = pickBoxSizeInput(params);
      if (boxInput) {
        compiled.input = {
          ...(compiled.input || {}),
          ...boxInput,
        };
      }
    }
    return compiled;
  }

  if (action === "wait_for") {
    const input = {};
    const seconds = toFiniteNumber(params.seconds);
    if (seconds !== undefined) {
      input.seconds = seconds;
    }
    if (Object.keys(input).length > 0) {
      compiled.input = input;
    }
    return compiled;
  }

  if (action === "press_keys") {
    const shortcut =
      typeof params.shortcut === "string" && params.shortcut.trim() !== ""
        ? params.shortcut
        : typeof params.keys === "string" && params.keys.trim() !== ""
          ? params.keys
          : undefined;
    if (shortcut) {
      compiled.input = { shortcut };
    }
    return compiled;
  }

  if (action === "assert") {
    if (typeof params.text === "string" && params.text.trim() !== "") {
      compiled.input = { text: params.text };
    }
    return compiled;
  }

  if (
    action === "screenshot" ||
    action === "start_video" ||
    action === "stop_video" ||
    action === "emit_annotation"
  ) {
    return compiled;
  }

  throw new Error(`Unsupported step action "${action}" at step "${id}".`);
}

function compileStepTemplate(step, context) {
  const resolved = resolveTemplateValue(step.step_template, context);
  if (!isRecord(resolved)) {
    throw new Error(`step_template for step "${step.id}" must resolve to an object.`);
  }

  const compiled = {
    ...resolved,
  };

  if (compiled.id === undefined && step.id !== undefined) {
    compiled.id = interpolateString(step.id, context);
  }
  if (compiled.title === undefined && step.title !== undefined) {
    compiled.title = interpolateString(step.title, context);
  }
  if (compiled.description === undefined && step.description !== undefined) {
    compiled.description = interpolateString(step.description, context);
  }
  if (compiled.kind === undefined) {
    compiled.kind = "action";
  }

  if (compiled.kind === "action" && compiled.action === undefined && step.action) {
    compiled.action = normalizeLegacyAction(step.action);
  }

  if (typeof compiled.id !== "string" || compiled.id.trim() === "") {
    throw new Error("compiled step_template must include non-empty id.");
  }
  if (typeof compiled.title !== "string" || compiled.title.trim() === "") {
    throw new Error(`compiled step_template "${compiled.id}" must include non-empty title.`);
  }

  return compiled;
}

function resolveOptionalObjectTemplate(template, context) {
  if (template === undefined) {
    return undefined;
  }
  const resolved = resolveTemplateValue(template, context);
  if (!isRecord(resolved)) {
    return undefined;
  }
  return resolved;
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
    if (step.step_template !== undefined) {
      steps.push(compileStepTemplate(step, context));
      continue;
    }
    const params = resolveTemplateValue(step.params_template, context);
    steps.push(compileLegacyStep(step, params, context));
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

  const scenario = {
    schema_version: "2.0.0",
    scenario_id: scenarioId,
    name: scenarioName,
    target: blueprint.target,
    metadata: resolveTemplateValue(blueprint.metadata_template, context),
    variables: Array.isArray(blueprint.variables_template)
      ? resolveTemplateValue(blueprint.variables_template, context)
      : [],
    steps,
  };

  const execution = resolveOptionalObjectTemplate(blueprint.execution_template, context);
  if (execution) {
    scenario.execution = execution;
  }

  const outputs = resolveOptionalObjectTemplate(blueprint.outputs_template, context);
  if (outputs) {
    scenario.outputs = outputs;
  }

  return {
    job_id: job.job_id,
    profile_id: profile.profile_id,
    blueprint_id: blueprint.blueprint_id,
    capabilities,
    scenario_path: scenarioPath,
    output_dir: outputDir,
    markdown_path: markdownPath,
    scenario,
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
