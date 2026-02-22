"use strict";

const semver = require("semver");

function getPathValue(source, path) {
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error("condition path must be a non-empty string.");
  }

  const segments = path.split(".");
  let cursor = source;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function normalizeVersion(input) {
  if (typeof input !== "string" || input.trim() === "") {
    return null;
  }

  const trimmed = input.trim();
  const coerced = semver.coerce(trimmed);
  if (!coerced) {
    return null;
  }
  return coerced.version;
}

function compareVersions(left, right) {
  const leftNormalized = normalizeVersion(left);
  const rightNormalized = normalizeVersion(right);
  if (!leftNormalized || !rightNormalized) {
    throw new Error(`unable to compare versions: left="${left}" right="${right}"`);
  }
  return semver.compare(leftNormalized, rightNormalized);
}

function evaluateCondition(condition, context) {
  if (!condition) {
    return true;
  }
  if (typeof condition === "boolean") {
    return condition;
  }
  if (Array.isArray(condition)) {
    throw new Error("condition must be an object, not an array.");
  }
  if (typeof condition !== "object") {
    throw new Error("condition must be an object.");
  }

  if (Array.isArray(condition.all)) {
    return condition.all.every((item) => evaluateCondition(item, context));
  }
  if (Array.isArray(condition.any)) {
    return condition.any.some((item) => evaluateCondition(item, context));
  }
  if (condition.not !== undefined) {
    return !evaluateCondition(condition.not, context);
  }
  if (typeof condition.capability === "string") {
    const value = getPathValue(context, `capabilities.${condition.capability}`);
    return value === true;
  }
  if (condition.equals) {
    const left = getPathValue(context, condition.equals.path);
    return left === condition.equals.value;
  }
  if (condition.exists) {
    return (
      getPathValue(
        context,
        typeof condition.exists === "string" ? condition.exists : condition.exists.path
      ) !== undefined
    );
  }
  if (condition.version_gte) {
    const left = getPathValue(context, condition.version_gte.path);
    return compareVersions(left, condition.version_gte.value) >= 0;
  }
  if (condition.version_gt) {
    const left = getPathValue(context, condition.version_gt.path);
    return compareVersions(left, condition.version_gt.value) > 0;
  }
  if (condition.version_lte) {
    const left = getPathValue(context, condition.version_lte.path);
    return compareVersions(left, condition.version_lte.value) <= 0;
  }
  if (condition.version_lt) {
    const left = getPathValue(context, condition.version_lt.path);
    return compareVersions(left, condition.version_lt.value) < 0;
  }

  throw new Error(`unsupported condition: ${JSON.stringify(condition)}`);
}

module.exports = {
  getPathValue,
  evaluateCondition,
  compareVersions
};
