import * as js from "@eslint/js";
import * as globals from "globals";
import tseslint from "typescript-eslint";
import * as pluginReact from "eslint-plugin-react";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

const nodeFiles = [
  "astro.config.mjs",
  "eslint.config.ts",
  "server.js",
  "svelte.config.js",
  "vite.config.js",
  "api/**/*.js",
  "scripts/**/*.js"
];

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser }
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: globals.node,
      sourceType: "module"
    }
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: globals.node,
      sourceType: "commonjs"
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: { version: "detect" }
    },
    rules: {
      "no-unused-vars": "off",
      "no-var": "off",
      "prefer-const": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }]
    }
  },
  {
    files: ["src/env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/no-empty-object-type": "off"
    }
  },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/gfm", extends: ["markdown/recommended"] },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] }
]);
