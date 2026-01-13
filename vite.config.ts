import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { interactiveTestsPlugin } from "./src/tests/interactive/vite-plugin";

export default defineConfig({
	plugins: [react(), tailwindcss(), interactiveTestsPlugin()],
	build: {
		target: "esnext",
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				"test-suite": resolve(__dirname, "test-suite.html"),
				"test-suite-core1": resolve(__dirname, "test-suite-core1.html"),
				"core2-editor": resolve(__dirname, "core2-editor.html"),
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
