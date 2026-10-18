/**
 * The production build ships the core3 worklet as a real JavaScript module.
 * Bundles only the audio host (audio.ts) with the project's resolve/worker
 * config, then follows the URL it hands to audioWorklet.addModule to the
 * emitted file. Guards against the worklet shipping as raw TypeScript (a bare
 * `?url` import inlined it as a `data:video/mp2t` URL), and checks the
 * worklet carries the WASM engine's path.
 */

import { resolve } from "node:path";
import { type Rollup, build, loadConfigFromFile, parseAst } from "vite";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../../..");

async function buildAudioHost(): Promise<Rollup.OutputBundle[keyof Rollup.OutputBundle][]> {
	const loaded = await loadConfigFromFile(
		{ command: "build", mode: "production" },
		resolve(root, "vite.config.ts"),
		root,
		"silent",
	);
	if (!loaded?.config.resolve || !loaded.config.worker)
		throw new Error("vite.config.ts lacks resolve/worker");
	const result = await build({
		root,
		configFile: false,
		logLevel: "silent",
		resolve: loaded.config.resolve,
		worker: loaded.config.worker,
		build: {
			write: false,
			target: "esnext",
			rollupOptions: {
				input: resolve(root, "src/engine/runtime/audio.ts"),
				// Keep the host's exports so the addModule call (and its URL) survives tree-shaking.
				preserveEntrySignatures: "strict",
			},
		},
	});
	const outputs = Array.isArray(result) ? result : [result];
	return outputs.flatMap((o) => ("output" in o ? o.output : []));
}

function sourceOf(file: Rollup.OutputChunk | Rollup.OutputAsset): string {
	return file.type === "chunk" ? file.code : String(file.source);
}

describe("production worklet build", () => {
	it("emits the worklet as a separate .js module with no TypeScript syntax", async () => {
		const files = await buildAudioHost();
		const host = files.find((f) => f.type === "chunk" && f.isEntry) as Rollup.OutputChunk;
		expect(host).toBeDefined();
		expect(host.code).not.toMatch(/data:/);

		const worklet = files.find((f) => f !== host && host.code.includes(`/${f.fileName}`));
		expect(worklet?.fileName).toMatch(/\.js$/);

		const code = sourceOf(worklet as Rollup.OutputChunk | Rollup.OutputAsset);
		expect(() => parseAst(code)).not.toThrow();
		expect(code).toContain("core3-processor");
		// The WASM backend's build step instantiates the posted Module in the worklet.
		expect(code).toContain("new WebAssembly.Instance");
	}, 60_000);
});
