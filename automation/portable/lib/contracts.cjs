"use strict";

const WEB_ACTIONS = new Set([
  "open_url",
  "click",
  "double_click",
  "right_click",
  "drag_drop",
  "drag",
  "type_text",
  "type",
  "wait_for",
  "wait",
  "assert",
  "press_keys",
  "keys",
  "shortcut",
  "screenshot",
  "start_video",
  "stop_video",
  "emit_annotation",
]);

const UNITY_ACTIONS = new Set([
  "click",
  "double_click",
  "right_click",
  "drag_drop",
  "drag",
  "type_text",
  "type",
  "wait_for",
  "wait",
  "assert",
  "press_keys",
  "keys",
  "shortcut",
  "open_menu",
  "menu",
  "select_hierarchy",
  "screenshot",
  "start_video",
  "stop_video",
  "emit_annotation",
]);

function ensureObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function ensureString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function ensureTarget(value, label) {
  if (value !== "web" && value !== "unity") {
    throw new Error(`${label} must be "web" or "unity".`);
  }
}

function validateProfile(profile) {
  ensureObject(profile, "profile");
  ensureString(profile.schema_version, "profile.schema_version");
  ensureString(profile.profile_id, "profile.profile_id");
  ensureString(profile.name, "profile.name");
  ensureTarget(profile.target, "profile.target");

  if (profile.versions !== undefined) {
    ensureObject(profile.versions, "profile.versions");
  }
  if (profile.capabilities !== undefined) {
    ensureObject(profile.capabilities, "profile.capabilities");
  }
  if (profile.anchors !== undefined) {
    ensureObject(profile.anchors, "profile.anchors");
  }
}

function validateBlueprintStep(step, target) {
  ensureObject(step, "blueprint step");
  if (step.id !== undefined) {
    ensureString(step.id, "step.id");
  }
  if (step.title !== undefined) {
    ensureString(step.title, "step.title");
  }

  if (step.step_template !== undefined) {
    ensureObject(step.step_template, "step.step_template");
  }

  if (step.step_template === undefined) {
    ensureString(step.action, "step.action");
    ensureObject(step.params_template, "step.params_template");

    const allowed = target === "web" ? WEB_ACTIONS : UNITY_ACTIONS;
    if (!allowed.has(step.action)) {
      throw new Error(
        `Unsupported action "${step.action}" for target "${target}" at step "${step.id}".`
      );
    }
  }
}

function validateBlueprint(blueprint) {
  ensureObject(blueprint, "blueprint");
  ensureString(blueprint.schema_version, "blueprint.schema_version");
  ensureString(blueprint.blueprint_id, "blueprint.blueprint_id");
  ensureString(blueprint.name, "blueprint.name");
  ensureTarget(blueprint.target, "blueprint.target");
  ensureObject(blueprint.metadata_template, "blueprint.metadata_template");

  if (!Array.isArray(blueprint.steps) || blueprint.steps.length === 0) {
    throw new Error("blueprint.steps must contain at least one step.");
  }
  blueprint.steps.forEach((step) => validateBlueprintStep(step, blueprint.target));
}

function validateMatrixJob(job) {
  ensureObject(job, "matrix job");
  ensureString(job.job_id, "job.job_id");
  ensureString(job.profile_id, "job.profile_id");
  ensureString(job.blueprint_id, "job.blueprint_id");
}

function validateMatrix(matrix) {
  ensureObject(matrix, "matrix");
  ensureString(matrix.schema_version, "matrix.schema_version");
  ensureString(matrix.matrix_id, "matrix.matrix_id");

  if (!Array.isArray(matrix.jobs) || matrix.jobs.length === 0) {
    throw new Error("matrix.jobs must contain at least one job.");
  }

  const seen = new Set();
  for (const job of matrix.jobs) {
    validateMatrixJob(job);
    if (seen.has(job.job_id)) {
      throw new Error(`matrix job_id "${job.job_id}" is duplicated.`);
    }
    seen.add(job.job_id);
  }
}

module.exports = {
  WEB_ACTIONS,
  UNITY_ACTIONS,
  validateProfile,
  validateBlueprint,
  validateMatrix,
};
