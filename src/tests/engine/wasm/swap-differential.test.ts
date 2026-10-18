/**
 * A swap A → B at block k on WASM (prepared against A, carried memory to
 * memory along the carry plan) matches the interpreter's swap bit for bit:
 * every output sample, every value slot at each block end, and the state
 * collected right after the swap and at the end. One case per kind of edit.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { factory, loop, p, runProgram, seq, tempo } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { slotOf } from "@/engine/runtime/output-slots";
import type { Program } from "@/engine/types";
import { createWasmEngine, swapWasmEngine } from "@/engine/wasm/host/create-wasm-engine";
import type { WasmEngine } from "@/engine/wasm/host/wasm-engine";
import { evalInternal } from "../fixtures/internal-module";

const SR = 48000;
const BLOCK = 128;
/** Block k: 0.2 s in, mid-cycle at 180 bpm. */
const BEFORE = 75;
const AFTER = 150;

const saw = factory("saw");
const sin = factory("sin");
const noise = factory("noise");
const lfo = factory("lfo");
const DELAY = { time: 0.05, feedback: 0.6, mix: 0.5 };

interface Edit {
	readonly before: () => Program;
	readonly after: () => Program;
	/** The rate B runs at; A runs at SR. */
	readonly rate?: number;
}

const patch =
	(body: () => void, seed = 1) =>
	() =>
		runProgram(body, { seed });

const random = (gain: number, local?: number) => () => {
	tempo(180);
	const s = seq(p`c4*8`.degrade(0.5));
	const n = local === undefined ? noise() : noise().seed(local);
	s.tri().mul(s.gate).add(n.mul(gain)).out();
};

const effects = (pattern: string) => () => {
	tempo(180);
	const s = seq(pattern);
	s.tri()
		.mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
		.phaser({ rate: 0.25, depth: 0.7, mix: 0.4 })
		.tape({ time: 0.1, feedback: 0.5, mix: 0.4 })
		.reverb({ room: 0.5, damp: 0.5, mix: 0.3 })
		.out();
};

/**
 * A module whose tick runs `body` (which sets `v`) and outputs `v`, then
 * `gain`. An edit to its code makes a new node (a new key: nothing carries),
 * so the edits are downstream and the module's lane carries.
 */
const swapper = (body: string, gain: number) => `tempo(180)
const sw = defineInternalModule({
  name: "sw",
  category: "utils",
  ins: { in: sig(0) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: () => ({
    n: 0,
    a: new Float32Array(3),
    b: new Float32Array(3),
    p: { buf: new Float64Array(2), k: 0 },
    q: { buf: new Float64Array(2), k: 0 },
    voices: [{ x: 0 }, { x: 0 }, { x: 0 }],
  }),
  tick: (s, i, o) => {
    ${body}
    o.out = v
  },
})
seq("[c3,e3] <g3 a3>").sw().mul(${gain}).out()`;

/**
 * Swaps the arrays every 7 samples: an odd number of swaps by the swap
 * (BEFORE blocks), so each name holds the other's storage.
 */
const SWAP_ARRAYS = `s.n++
    s.a[s.n % 3] += i.in * 0.001
    if (s.n % 7 === 0) { const t = s.a; s.a = s.b; s.b = t }
    const v = s.a[0] - s.b[1]`;

/** As SWAP_ARRAYS; late in A, one-way: both names hold one array. */
const ALIAS_ARRAYS = `${SWAP_ARRAYS}
    if (s.n === 7919) s.b = s.a`;

/** Swaps the records every 7 samples and the arrays inside them every 19: both odd by the swap. */
const SWAP_RECORDS = `s.n++
    s.p.buf[s.n % 2] += i.in * 0.001
    s.p.k += 1
    if (s.n % 7 === 0) { const t = s.p; s.p = s.q; s.q = t }
    if (s.n % 19 === 0) { const u = s.p.buf; s.p.buf = s.q.buf; s.q.buf = u }
    const v = s.p.buf[0] - s.q.buf[1] + s.p.k * 0.0001`;

/** Swaps the first and last records of an array of records every 7 samples: odd by the swap. */
const SWAP_ELEMENTS = `s.n++
    s.voices[(s.n | 0) & 1].x += i.in * 0.001
    if (s.n % 7 === 0) { const t = s.voices[0]; s.voices[0] = s.voices[2]; s.voices[2] = t }
    const v = s.voices[0].x - s.voices[2].x * 0.5 + s.voices[1].x * 0.25`;

/** As SWAP_ELEMENTS; late in A, one-way: two elements name one record. */
const ALIAS_ELEMENTS = `${SWAP_ELEMENTS}
    if (s.n === 7919) s.voices[1] = s.voices[0]`;

const EDITS: Record<string, Edit> = {
	"knob change": {
		before: patch(() => saw(48).lpf(80).delay(DELAY).out()),
		after: patch(() => saw(48).lpf(82).delay(DELAY).out()),
	},
	rewiring: {
		before: patch(() => saw(48).lpf(80).delay(DELAY).out()),
		after: patch(() => saw(48).lpf(80).mod("cutoff", lfo(0.3), 12).delay(DELAY).out()),
	},
	"added node": {
		before: patch(() => saw(48).lpf(80).delay(DELAY).out()),
		after: patch(() => saw(48).lpf(80).hpf(40).delay(DELAY).out()),
	},
	"deleted node": {
		before: patch(() => {
			saw(48).lpf(60).delay(DELAY).out();
			saw(55).lpf(60).delay(DELAY).out();
		}),
		after: patch(() => saw(55).lpf(60).delay(DELAY).out()),
	},
	feedback: {
		before: patch(() =>
			loop((fb) => sin(48).add(fb.lpf(90).mul(0.9)))
				.mul(0.1)
				.out(),
		),
		after: patch(() =>
			loop((fb) => sin(48).add(fb.lpf(90).mul(0.8)))
				.mul(0.1)
				.out(),
		),
	},
	"seed kept": { before: patch(random(0.1), 1), after: patch(random(0.2), 1) },
	"seed rerolled": { before: patch(random(0.1), 1), after: patch(random(0.1), 2) },
	"local seed edited": { before: patch(random(0.1, 3), 1), after: patch(random(0.1, 4), 1) },
	"pattern edit, array state": {
		before: patch(effects("c3 e3 g3 b3")),
		after: patch(effects("c3 e3 a3 c4")),
	},
	"swapped arrays carried": {
		before: () => evalInternal(swapper(SWAP_ARRAYS, 0.1)),
		after: () => evalInternal(swapper(SWAP_ARRAYS, 0.2)),
	},
	"one array under two names carried as two": {
		before: () => evalInternal(swapper(ALIAS_ARRAYS, 0.1)),
		after: () => evalInternal(swapper(ALIAS_ARRAYS, 0.2)),
	},
	"swapped records holding swapped arrays carried": {
		before: () => evalInternal(swapper(SWAP_RECORDS, 0.1)),
		after: () => evalInternal(swapper(SWAP_RECORDS, 0.2)),
	},
	"swapped elements of an array of records carried": {
		before: () => evalInternal(swapper(SWAP_ELEMENTS, 0.1)),
		after: () => evalInternal(swapper(SWAP_ELEMENTS, 0.2)),
	},
	"one record under two elements carried as two": {
		before: () => evalInternal(swapper(ALIAS_ELEMENTS, 0.1)),
		after: () => evalInternal(swapper(ALIAS_ELEMENTS, 0.2)),
	},
	"sample-rate change": {
		before: patch(() => saw(48).lpf(80).delay(DELAY).out()),
		after: patch(() => saw(48).lpf(80).delay(DELAY).out()),
		rate: 44100,
	},
};

interface Pair {
	readonly js: Core3Engine;
	readonly wasm: WasmEngine;
}

const registry = (program: Program) => withProgramSpecs(getRegistry(), program);

/** A at SR on both, `BEFORE` blocks, then B swapped in on both. */
function swapAtK({ before, after, rate = SR }: Edit): Pair {
	const a = before();
	const old = {
		js: new Core3Engine(a, SR, registry(a)),
		wasm: createWasmEngine(a, SR, getRegistry()),
	};
	expect(render(old, BEFORE)).toBeNull();
	const b = after();
	return {
		js: new Core3Engine(b, rate, registry(b), old.js.liveState()),
		wasm: swapWasmEngine(b, rate, getRegistry(), old.wasm),
	};
}

/** The first output sample or block-end value slot whose bits differ, or null. */
function render({ js, wasm }: Pair, blocks: number): string | null {
	const jl = new Float32Array(BLOCK);
	const jr = new Float32Array(BLOCK);
	const wl = new Float32Array(BLOCK);
	const wr = new Float32Array(BLOCK);
	for (let b = 0; b < blocks; b++) {
		js.renderBlock(jl, jr, 0, BLOCK);
		wasm.renderBlock(wl, wr, 0, BLOCK);
		for (let k = 0; k < BLOCK; k++)
			if (!Object.is(jl[k], wl[k]) || !Object.is(jr[k], wr[k]))
				return `block ${b} sample ${k}: js ${jl[k]}/${jr[k]}, wasm ${wl[k]}/${wr[k]}`;
		const slot = firstSlot(js, wasm);
		if (slot !== null) return `block ${b}: ${slot}`;
	}
	return null;
}

function firstSlot(js: Core3Engine, wasm: WasmEngine): string | null {
	const { bases, laneCounts } = js.layout;
	for (const [node, ports] of bases.entries())
		for (const port of Object.keys(ports))
			for (let lane = 0; lane < (laneCounts[node] as number); lane++) {
				const a = js.peek(node, port, lane);
				const b = wasm.slot(slotOf(js.layout, node, port, lane));
				if (!Object.is(a, b)) return `node ${node} ${port}[${lane}] js ${a}, wasm ${b}`;
			}
	return null;
}

describe("a swap A → B at block k: WASM matches the interpreter", () => {
	for (const [name, edit] of Object.entries(EDITS)) {
		it(name, () => {
			const pair = swapAtK(edit);
			expect(pair.wasm.collectState()).toEqual(pair.js.collectState());
			expect(render(pair, AFTER)).toBeNull();
			expect(pair.wasm.collectState()).toEqual(pair.js.collectState());
			expect(pair.wasm.sampleCount).toBe((BEFORE + AFTER) * BLOCK);
		});
	}
});
