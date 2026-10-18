import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	test: {
		testTimeout: 20_000,
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
