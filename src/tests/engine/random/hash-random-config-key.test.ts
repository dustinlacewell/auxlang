/**
 * A `hashRandom` key that may be a config string is a bind-time error that
 * names the module and the key: config is per node, so the string cannot
 * fold to its hash when the module binds, and hashing it as a number would
 * change its meaning. A config field declared as a number, or a config
 * string only compared, is a fine key on both backends.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { out, runProgram } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { defmod } from "@/engine/patch/defmod";
import { hashRandom as hostHashRandom } from "@/engine/random/hash-random";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { slotOf } from "@/engine/runtime/output-slots";
import type { Program } from "@/engine/types";
import { prepareWasm } from "@/engine/wasm/host/prepare-wasm";
import { WasmEngine } from "@/engine/wasm/host/wasm-engine";
import { evalPatch } from "@/engine/eval-patch";

/** The tick's own binding (module/bind-random): one argument, the patch seed implied. */
declare const hashRandom: (key: number | string) => number;

const SR = 48000;

/**
 * A patch defining `name` with a config param `name = "kick"` (a shape-C
 * config key, unlike a port, has no local alias — the tick refers to it by
 * its own property name) and a tick of `body`.
 */
function patchWith(moduleName: string, body: string): () => Program {
	const src = `defmod("${moduleName}", {}, ({ sr, name = "kick" }) => {
  return ({ in: x = 0 }) => {
${body}
  }
})`;
	return () => evalPatch(src);
}

describe("hashRandom with a config key", () => {
	it("refuses a config string key at bind time, naming the module and the key", () => {
		const bind = patchWith("hk.name", "return hashRandom(name)");
		expect(bind).toThrow(/hk\.name.*hashRandom key `__dsp_cfg\.name` reads config 'name'/);
	});

	it("refuses a local set from a config string", () => {
		const bind = patchWith("hk.alias", ["const k = name", "return hashRandom(k + 1)"].join("\n"));
		expect(bind).toThrow(
			/hk\.alias.*hashRandom key `k \+ 1` reads local 'k' \(set from config 'name'\)/,
		);
	});

	it("takes a block's own local that shadows a config alias", () => {
		const bind = patchWith(
			"hk.shadow",
			[
				"const k = name",
				"let v = 0",
				"if (k === 0) { v = 1 } else { const k = 3; v = hashRandom(k) }",
				"return v",
			].join("\n"),
		);
		expect(bind).not.toThrow();
	});

	it("refuses an outer alias read past a block's shadow", () => {
		const bind = patchWith(
			"hk.past",
			["const k = name", "{ const k = 3; if (k === 3) return 0 }", "return hashRandom(k)"].join(
				"\n",
			),
		);
		expect(bind).toThrow(/hk\.past.*hashRandom key `k` reads local 'k' \(set from config 'name'\)/);
	});

	it("takes a number config field and a compared config string, the same on both backends", () => {
		const program: Program = runProgram(
			() => {
				const node = defmod(
					"hk.number",
					{},
					(({ index = 3, mode = "a" }: { index: number; mode: string }) => {
						return ({ in: x = 0 }: { in: number }) =>
							x * 0 + hashRandom(index + (mode === "a" ? 0 : 1));
					}) as never,
				);
				out(node({}));
			},
			{ seed: 5 },
		);
		const js = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
		const prepared = prepareWasm(program, SR);
		const wasm = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
		const l = new Float32Array(128);
		const r = new Float32Array(128);
		js.renderBlock(l, r, 0, 128);
		wasm.renderBlock(l, r, 0, 128);
		const node = program.nodes.findIndex((n) => n.module === "hk.number");
		expect(js.peek(node, "out", 0)).toBe(hostHashRandom(3, 5));
		expect(wasm.slot(slotOf(js.layout, node, "out", 0))).toBe(hostHashRandom(3, 5));
	});
});
