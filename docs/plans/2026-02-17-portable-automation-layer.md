# Portable Automation Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable, profile-driven automation layer that can regenerate guidebook docs/images/videos across different avatar states, Unity versions, and tool versions without rewriting step logic.

**Architecture:** Add a repository-local portable layer on top of `automation-scenario` with four parts: profile definitions, reusable blueprints, capability/version rules, and a compiler/runner CLI. Compilation resolves templates and conditions into deterministic `.scenario.json` files and manifest output. Execution uses compiled scenarios to call `automation-scenario run-scenario` consistently.

**Tech Stack:** Node.js (CJS), semver, built-in `node:test`, existing `automation-scenario` CLI.

### Task 1: Define portable data contracts

**Files:**

- Create: `automation/portable/schemas/README.md`
- Create: `automation/portable/examples/*.json`
- Test: `tests/automation/portable.contracts.test.cjs`

**Step 1: Write failing tests for contract expectations**

```
assert.equal(result.ok, true)
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/automation/portable.contracts.test.cjs`
Expected: FAIL because parser/validator does not exist yet.

**Step 3: Implement minimal validator/parsing layer**

```
const profile = loadJson(path)
validateProfile(profile)
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/automation/portable.contracts.test.cjs`
Expected: PASS.

### Task 2: Build compiler with capability/version gating

**Files:**

- Create: `automation/portable/lib/compiler.cjs`
- Create: `automation/portable/lib/conditions.cjs`
- Test: `tests/automation/portable.compiler.test.cjs`

**Step 1: Write failing tests for interpolation/refs/conditions**

```
const compiled = compileMatrix(input)
assert.equal(compiled.jobs.length, 1)
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/automation/portable.compiler.test.cjs`
Expected: FAIL with missing module/function.

**Step 3: Implement minimal compiler**

```
const manifest = compileMatrix(input)
assert.equal(Array.isArray(manifest.jobs), true)
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/automation/portable.compiler.test.cjs`
Expected: PASS.

### Task 3: Add runner CLI and dry-run safety

**Files:**

- Create: `automation/portable/cli.cjs`
- Create: `automation/portable/lib/runner.cjs`
- Test: `tests/automation/portable.runner.test.cjs`
- Modify: `package.json`

**Step 1: Write failing tests for command planning**

```
const plan = await runCompiledJobs({ dryRun: true })
assert.equal(plan.length > 0, true)
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/automation/portable.runner.test.cjs`
Expected: FAIL.

**Step 3: Implement CLI/runner**

```
await runCli(["compile", "--matrix", "path/to/matrix.json"])
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/automation/portable.runner.test.cjs`
Expected: PASS.

### Task 4: Integrate repository workflows

**Files:**

- Modify: `package.json`
- Create: `automation/portable/blueprints/*.json`
- Create: `automation/portable/profiles/*.json`
- Create: `automation/portable/matrices/default.matrix.json`

**Step 1: Add failing integration test for compile output paths**

```
await compileFromFiles(options)
assert.equal(fileExists(scenarioPath), true)
```

**Step 2: Run test to verify it fails**

Run: `npm run test:automation`
Expected: FAIL before integration wiring.

**Step 3: Implement workflow scripts and sample portable assets**

```
{
  "test:automation": "node --test tests/automation/*.test.cjs"
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test:automation`
Expected: PASS.

### Task 5: Documentation and final verification

**Files:**

- Modify: `README.md`
- Create: `docs/controls/automation-portable.md`
- Modify: `docs/controls/index.md`
- Modify: `docs/.vitepress/config.mts`

**Step 1: Document CLI args and E2E examples**

```
Include compile/run/scaffold examples and profile customization workflow.
```

**Step 2: Run full verification suite**

Run: `npm run verify`
Expected: PASS.

**Step 3: Run portable automation tests**

Run: `npm run test:automation`
Expected: PASS.

**Step 4: Confirm no unintended generated artifacts are committed**

Run: `git status --short`
Expected: only source/docs/test changes.
