import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Library build: one entry per published subpath (package.json exports),
 * each landing at dist/<subpath>.js. Kept separate from vite.config.ts so
 * the vitest config there stays untouched.
 */
const ENTRIES = {
	"auxlang-theme": "src/auxlang-theme.ts",
	extensions: "src/extensions.ts",
	"module-highlight": "src/module-highlight.ts",
	"live-display/pattern-highlight-extension": "src/live-display/pattern-highlight-extension.ts",
	"live-display/scope-widget-extension": "src/live-display/scope-widget-extension.ts",
	"live-input/control-widget-extension": "src/live-input/control-widget-extension.ts",
	"live-input/number-drag-extension": "src/live-input/number-drag-extension.ts",
};

export default defineConfig({
	build: {
		outDir: "dist",
		lib: {
			entry: Object.fromEntries(
				Object.entries(ENTRIES).map(([subpath, file]) => [subpath, resolve(__dirname, file)]),
			),
			formats: ["es"],
			fileName: (_format, entryName) => `${entryName}.js`,
		},
		rollupOptions: {
			external: [
				"auxlang/dsp/define",
				"auxlang/library/all",
				"auxlang/runtime/audio",
				"auxlang/runtime/live/live-contract",
				"auxlang/runtime/live/monitor-region",
				"auxlang/source/range",
				"auxlang/source/source-map",
				"auxlang/types",
				"@codemirror/autocomplete",
				"@codemirror/lang-javascript",
				"@codemirror/language",
				"@codemirror/state",
				"@codemirror/theme-one-dark",
				"@codemirror/view",
				"@lezer/highlight",
			],
		},
		minify: false,
	},
});
