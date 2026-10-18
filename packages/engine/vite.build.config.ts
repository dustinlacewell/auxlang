import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Library build: one entry per published subpath (package.json
 * publishConfig.exports), each landing at dist/<subpath>.js. Shared code
 * between entries is split into chunks by Vite/Rollup. Kept separate from
 * vite.config.ts so the vitest config there stays untouched.
 */
const ENTRIES = {
	api: "src/api.ts",
	"dsp/define": "src/dsp/define.ts",
	"eval-patch": "src/eval-patch.ts",
	"library/all": "src/library/all.ts",
	"runtime/audio": "src/runtime/audio.ts",
	"runtime/live/live-contract": "src/runtime/live/live-contract.ts",
	"runtime/live/monitor-region": "src/runtime/live/monitor-region.ts",
	"runtime/render": "src/runtime/render.ts",
	"source/line-column": "src/source/line-column.ts",
	"source/located-error": "src/source/located-error.ts",
	"source/range": "src/source/range.ts",
	"source/source-map": "src/source/source-map.ts",
	types: "src/types.ts",
	"viz/dot-colors": "src/viz/dot-colors.ts",
	"viz/edge-connections": "src/viz/edge-connections.ts",
	"viz/program-spec": "src/viz/program-spec.ts",
	"viz/program-to-dot": "src/viz/program-to-dot.ts",
};

export default defineConfig({
	// Relative base: the worklet's emitted URL resolves against the
	// consuming module's own location (new URL(..., import.meta.url)),
	// not the page root. Required for a published package — its dist/
	// is not necessarily served from the app's web root.
	base: "./",
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
			external: ["acorn"],
		},
		minify: false,
		worker: {
			format: "es",
		},
	},
});
