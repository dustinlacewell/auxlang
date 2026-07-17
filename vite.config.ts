import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { interactiveTestsPlugin } from "./src/tests/interactive/vite-plugin";
import { patternTestsPlugin } from "./src/tests/patterns/vite-plugin";

export default defineConfig({
	plugins: [react(), tailwindcss(), interactiveTestsPlugin(), patternTestsPlugin()],
	build: {
		target: "esnext",
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				"test-suite": resolve(__dirname, "test-suite.html"),
				"pattern-tests": resolve(__dirname, "pattern-tests.html"),
				"core2-editor": resolve(__dirname, "core2-editor.html"),
				core3: resolve(__dirname, "core3.html"),
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
});
