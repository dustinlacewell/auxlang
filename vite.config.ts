import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import { interactiveTestsPlugin } from "./src/tests/interactive/vite-plugin";
import { patternTestsPlugin } from "./src/tests/patterns/vite-plugin";

export default defineConfig(({ command }) => ({
	plugins: [react(), tailwindcss(), interactiveTestsPlugin(), patternTestsPlugin()],
	test: {
		exclude: [...configDefaults.exclude, "**/.claude/worktrees/**"],
		// Renders of heavy patches near 5 s when the full suite runs in parallel.
		testTimeout: 20_000,
	},
	build: {
		target: "esnext",
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				editor: resolve(__dirname, "editor.html"),
				guide: resolve(__dirname, "guide.html"),
				guide2: resolve(__dirname, "guide2.html"),
				patterns: resolve(__dirname, "patterns.html"),
				modules: resolve(__dirname, "modules.html"),
				moduleDsp: resolve(__dirname, "module-dsp.html"),
				core3: resolve(__dirname, "core3.html"),
				// perf.html is a dev-only diagnostic harness — served in dev, never
				// built into a production bundle.
				...(command === "serve" ? { perf: resolve(__dirname, "perf.html") } : {}),
			},
		},
	},
	worker: {
		format: "es",
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
}));
