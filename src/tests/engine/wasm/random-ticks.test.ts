/**
 * A tick's randomness on both backends: `Math.random()` (the lane's stream)
 * and `hashRandom(key)` (number and string keys) render bit-identically on
 * the interpreter and on WASM, which compile the same random/lib text. A
 * re-eval that keeps the seed continues each stream on both; one that
 * rerolls it starts the new seed's streams on both.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { out, runProgram, seq, tempo } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { hashRandom as hostHashRandom } from "@/engine/random/hash-random";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { slotOf } from "@/engine/runtime/output-slots";
import type { Program } from "@/engine/types";
import { sig } from "@/engine/types";
import { createWasmEngine, swapWasmEngine } from "@/engine/wasm/host/create-wasm-engine";
import type { WasmEngine } from "@/engine/wasm/host/wasm-engine";
import { defineInternalModule } from "../fixtures/internal-module";

/** The tick's own binding: one argument, the patch seed implied. */
declare const hashRandom: (key: number | string) => number;

const SR = 48000;
const BLOCK = 128;
const BLOCKS = 40;

/** A two-lane stream (a chord feeds it), a stepped number key and a string key, all to out. */
function patch(seed: number): Program {
	return runProgram(
		() => {
			const jitter = defineInternalModule({
				name: "rt.jitter",
				category: "sources",
				ins: { in: sig(0) },
				outs: { out: sig() },
				defaultIn: "in",
				defaultOut: "out",
				tick: (s, i, o) => {
					o.out = i.in * 0 + Math.random() - 0.5;
				},
			});
			const steps = defineInternalModule({
				name: "rt.steps",
				category: "utils",
				ins: { hold: sig(64) },
				outs: { out: sig(), kick: sig() },
				defaultIn: "hold",
				defaultOut: "out",
				state: () => ({ n: 0 }),
				tick: (s, i, o) => {
					const n = s.n as number;
					s.n = n + 1;
					o.out = hashRandom(Math.floor(n / i.hold) + 0.25 * (n % 3)) - 0.5;
					o.kick = hashRandom("kick");
				},
			});
			tempo(120);
			out(jitter({ in: seq("[c3,e3]") }).mul(0.3));
			out(steps({ hold: 64 }).mul(0.3));
		},
		{ seed },
	);
}

interface Pair {
	readonly program: Program;
	readonly js: Core3Engine;
	readonly wasm: WasmEngine;
}

/** Both backends built for `program`, each continuing its own engine of `prev` when given. */
function engines(program: Program, prev?: Pair): Pair {
	const registry = withProgramSpecs(getRegistry(), program);
	const js = new Core3Engine(program, SR, registry, prev?.js.collectState());
	const wasm =
		prev === undefined
			? createWasmEngine(program, SR, registry)
			: swapWasmEngine(program, SR, registry, prev.wasm);
	return { program, js, wasm };
}

/**
 * Render `BLOCKS` blocks on both, asserting the outputs match sample for
 * sample and every random output's slot matches at each block end. Returns
 * those values by `module.port.lane`.
 */
function render({ program, js, wasm }: Pair): Record<string, number[]> {
	const sites = program.nodes.flatMap((n, node) =>
		n.module.startsWith("rt.")
			? Object.keys(js.layout.bases[node] ?? {}).flatMap((port) =>
					n.lanes.map((_, lane) => ({ name: `${n.module}.${port}.${lane}`, node, port, lane })),
				)
			: [],
	);
	const series: Record<string, number[]> = Object.fromEntries(sites.map((s) => [s.name, []]));
	const jl = new Float32Array(BLOCK);
	const jr = new Float32Array(BLOCK);
	const wl = new Float32Array(BLOCK);
	const wr = new Float32Array(BLOCK);
	for (let b = 0; b < BLOCKS; b++) {
		js.renderBlock(jl, jr, 0, BLOCK);
		wasm.renderBlock(wl, wr, 0, BLOCK);
		expect(Array.from(wl)).toEqual(Array.from(jl));
		expect(Array.from(wr)).toEqual(Array.from(jr));
		for (const { name, node, port, lane } of sites) {
			const value = js.peek(node, port, lane);
			expect(wasm.slot(slotOf(js.layout, node, port, lane))).toBe(value);
			series[name]?.push(value);
		}
	}
	return series;
}

const STREAMS = ["rt.jitter.out.0", "rt.jitter.out.1"];
const HASHES = ["rt.steps.out.0", "rt.steps.kick.0"];

function pick(series: Record<string, number[]>, names: readonly string[]): number[][] {
	return names.map((n) => series[n] ?? []);
}

describe("tick randomness on the interpreter and WASM", () => {
	it("renders bit-identically, each lane its own stream", () => {
		const series = render(engines(patch(7)));
		const [lane0, lane1] = pick(series, STREAMS);
		expect(new Set(lane0).size).toBe(BLOCKS);
		expect(lane0).not.toEqual(lane1);
		expect(new Set(series["rt.steps.out.0"]).size).toBeGreaterThan(BLOCKS / 2);
	});

	it("folds a string key to the host's value for that string", () => {
		const series = render(engines(patch(7)));
		expect(series["rt.steps.kick.0"]?.[0]).toBe(hostHashRandom("kick", 7));
	});

	it("continues every stream across a re-eval that keeps the seed", () => {
		const before = engines(patch(7));
		render(before);
		const reference = engines(patch(7));
		const fromStart = render(reference);
		const continued = render(reference);

		const swapped = render(engines(patch(7), before));
		expect(swapped).toEqual(continued);
		expect(pick(swapped, STREAMS)).not.toEqual(pick(fromStart, STREAMS));
	});

	it("starts the new seed's streams across a re-eval that rerolls it", () => {
		const before = engines(patch(7));
		render(before);
		const swapped = render(engines(patch(8), before));

		const fresh = engines(patch(8));
		const freshStart = render(fresh);
		const freshLater = render(fresh);
		// Streams restart from the new seed; the hash keys (the step count) carry on.
		expect(pick(swapped, STREAMS)).toEqual(pick(freshStart, STREAMS));
		expect(pick(swapped, HASHES)).toEqual(pick(freshLater, HASHES));
		expect(swapped["rt.steps.kick.0"]?.[0]).toBe(hostHashRandom("kick", 8));
	});
});
