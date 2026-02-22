import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  eslint.configs.recommended,
  prettierConfig,
  {
    ignores: [
      "docs/.vitepress/dist/**",
      "docs/.vitepress/cache/**",
      "node_modules/**",
      "artifacts/**",
      "automation/scenarios/generated/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["tests/a11y/**/*.js", "tests/a11y/**/*.spec.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  }
];
