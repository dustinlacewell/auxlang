import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
	build: {
		target: "esnext",
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				"test-suite": resolve(__dirname, "test-suite.html"),
			},
		},
	},
	worker: {
		format: "es",
	},
});
