/**
 * A `hashRandom` key that may be a config string is a bind-time error that
 * names the module and the key: config is per node, so the string cannot
 * fold to its hash when the module binds, and hashing it as a number would
 * change its meaning. A config field declared as a number, or a config
 * string only compared, is a fine key on both backends.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { defmod, out, runProgram } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { hashRandom as hostHashRandom } from "@/core3/random/hash-random";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { slotOf } from "@/core3/runtime/output-slots";
import type { Program, TickFn } from "@/core3/types";
import { sig } from "@/core3/types";
import { prepareWasm } from "@/core3/wasm/host/prepare-wasm";
import { WasmEngine } from "@/core3/wasm/host/wasm-engine";

/** The tick's own binding: one argument, the patch seed implied. */
declare const hashRandom: (key: number | string) => number;

const SR = 48000;

function keyed(name: string, config: Record<string, unknown>, tick: TickFn) {
	return () =>
		defmod({
			name,
			category: "utils",
			ins: { in: sig(0) },
			outs: { out: sig() },
			defaultIn: "in",
			defaultOut: "out",
			config,
			tick,
		});
}

describe("hashRandom with a config key", () => {
	it("refuses a config string key at bind time, naming the module and the key", () => {
		const bind = keyed("hk.name", { name: "kick" }, (s, i, o, c) => {
			o.out = hashRandom(c.name as number);
		});
		expect(bind).toThrow(/defmod\('hk\.name'\) tick: hashRandom key `c\.name` reads config 'name'/);
	});

	it("refuses a local set from a config string", () => {
		const bind = keyed("hk.alias", { name: "kick" }, (s, i, o, c) => {
			const k = c.name as number;
			o.out = hashRandom(k + 1);
		});
		expect(bind).toThrow(
			/hk\.alias.*hashRandom key `k \+ 1` reads local 'k' \(set from config 'name'\)/,
		);
	});

	it("refuses an undeclared config field", () => {
		const bind = keyed("hk.undeclared", {}, (s, i, o, c) => {
			o.out = hashRandom(c.step as number);
		});
		expect(bind).toThrow(/hk\.undeclared.*reads config 'step', which is not declared a number/);
	});

	it("takes a number config field and a compared config string, the same on both backends", () => {
		const program: Program = runProgram(
			() => {
				const node = keyed("hk.number", { index: 3, mode: "a" }, (s, i, o, c) => {
					o.out = i.in * 0 + hashRandom((c.index as number) + (c.mode === "a" ? 0 : 1));
				})();
				out(node({}));
			},
			{ seed: 5 },
		);
		const js = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
		const prepared = prepareWasm(program, SR);
		const wasm = new WasmEngine(
			new WebAssembly.Module(prepared.compiled.bytes),
			prepared.compiled,
			prepared.start,
		);
		const l = new Float32Array(128);
		const r = new Float32Array(128);
		js.renderBlock(l, r, 0, 128);
		wasm.renderBlock(l, r, 0, 128);
		const node = program.nodes.findIndex((n) => n.module === "hk.number");
		expect(js.peek(node, "out", 0)).toBe(hostHashRandom(3, 5));
		expect(wasm.slot(slotOf(js.layout, node, "out", 0))).toBe(hostHashRandom(3, 5));
	});
});
