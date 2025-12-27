import js from "@eslint/js";
import * as globals from "globals";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
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
	"scripts/**/*.js",
];

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		plugins: { js },
		...js.configs.recommended,
		languageOptions: {
			...js.configs.recommended.languageOptions,
			globals: globals.browser,
		},
	},
	{
		files: nodeFiles,
		languageOptions: {
			globals: globals.node,
			sourceType: "module",
		},
	},
	{
		files: ["**/*.cjs"],
		languageOptions: {
			globals: globals.node,
			sourceType: "commonjs",
		},
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	tseslint.configs.recommended,
	react.configs.flat.recommended,
	{
		settings: {
			react: { version: "detect" },
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
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ args: "none", caughtErrors: "none" },
			],
		},
	},
	{
		files: ["src/env.d.ts"],
		rules: {
			"@typescript-eslint/triple-slash-reference": "off",
			"@typescript-eslint/no-empty-object-type": "off",
		},
	},
	{
		files: ["**/*.json"],
		plugins: { json },
		...json.configs.recommended,
		language: "json/json",
	},
	{
		files: ["**/*.jsonc"],
		plugins: { json },
		...json.configs.recommended,
		language: "json/jsonc",
	},
	{
		files: ["**/*.json5"],
		plugins: { json },
		...json.configs.recommended,
		language: "json/json5",
	},
	{
		files: ["**/*.md"],
		plugins: { markdown },
		...markdown.configs.recommended,
		language: "markdown/gfm",
	},
	{
		files: ["**/*.css"],
		plugins: { css },
		...css.configs.recommended,
		language: "css/css",
	},
]);
