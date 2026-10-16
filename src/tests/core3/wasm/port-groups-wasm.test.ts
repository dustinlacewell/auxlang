/**
 * Port groups on WASM: a defmod with an in-group or an out-group renders
 * bit-identical to the interpreter for 8 s, at width 1 and width 2, and a
 * re-eval that adds, removes, renames or reorders a member keeps the
 * upstream lfo's phase on both engines while the two engines stay identical.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { EngineState, Program } from "@/core3/types";
import { createWasmEngine, swapWasmEngine } from "@/core3/wasm/host/create-wasm-engine";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";
import {
	type Run,
	SR,
	expectIdentical,
	expectSameRun,
	firstBitDiff,
	interpreterRun,
	renderBlocks,
	renderTicks,
	wasmRun,
} from "./differential-harness";

const EIGHT_SECONDS = 8 * SR;

const MIX_TICK =
	"let sum = 0; for (let k = 0; k < i.ch.length; k++) sum += i.ch[k] * i.level[k]; o.out = sum;";

function defIn(name: string, tick: string): string {
	return [
		`const ${name} = defmod({`,
		`  name: "${name}",`,
		'  category: "utils",',
		'  ins: { ch: group(sig(0), { open: true }), level: group(unit(1), { like: "ch" }) },',
		"  outs: { out: sig(0) },",
		'  defaultIn: "ch",',
		'  defaultOut: "out",',
		"  tick: (s, i, o, c) => {",
		`    ${tick}`,
		"  },",
		"})",
	].join("\n");
}

const GMIX = defIn("gmix", MIX_TICK);

const GFAN = [
	"const gfan = defmod({",
	'  name: "gfan",',
	'  category: "utils",',
	"  ins: { ch: group(sig(0), { open: true }) },",
	"  outs: { g: group(sig(0), { open: true }) },",
	'  defaultIn: "ch",',
	"  tick: (s, i, o, c) => {",
	"    for (let k = 0; k < i.ch.length; k++) o.g[k] = i.ch[k] * 2;",
	"  },",
	"})",
].join("\n");

function patch(...lines: string[]): Program {
	return evalPatch(lines.join("\n"));
}

describe("port groups on WASM are bit-identical to the interpreter (8 s)", () => {
	it("constant members with a level setter; sample 0 is 1", () => {
		const ref = expectIdentical(
			patch(GMIX, "gmix({ a: 0.5, b: 0.25 }).level({ b: 2 }).out()"),
			EIGHT_SECONDS,
		);
		expect(ref.l[0]).toBe(1);
	});

	it("signal members with .mod on a member level", () => {
		const ref = expectIdentical(
			patch(GMIX, 'gmix({ a: sin(60), b: tri(67) }).mod("level.b", lfo(0.3, -1, 1), 1).out()'),
			EIGHT_SECONDS,
		);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
	});

	it("one member; its unset like-member takes the default level 1", () => {
		const ref = expectIdentical(patch(GMIX, "gmix({ a: lfo(0.2) }).out()"), EIGHT_SECONDS);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
	});

	it("an out-group: o.g[k] = i.ch[k] * 2 taps both members by name", () => {
		const ref = expectIdentical(
			patch(
				GFAN,
				"const f = gfan({ ch: { a: sin(60), b: tri(67) }, g: ['a', 'b'] })",
				"out({ l: f.a, r: f.b })",
			),
			EIGHT_SECONDS,
		);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
		expect(Math.max(...ref.r.map(Math.abs))).toBeGreaterThan(0.1);
		expect(firstBitDiff(ref.l, ref.r)).not.toBe(-1);
	});

	it("width 2: a member driven by a two-lane stack", () => {
		const ref = expectIdentical(
			patch(GMIX, "tempo(120)", "gmix({ a: sin(p`[60, 67]`), b: 0.1 }).out()"),
			EIGHT_SECONDS,
		);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
	});

	it("i.ch.length read into a local and used in arithmetic: 3 members give 0.75", () => {
		const glen = defIn("glen", "const n = i.ch.length; o.out = n * 0.25;");
		const ref = expectIdentical(patch(glen, "glen({ a: 0.1, b: 0.2, c: 0.3 }).out()"), EIGHT_SECONDS);
		expect(ref.l[0]).toBe(0.75);
		expect(ref.l[EIGHT_SECONDS - 1]).toBe(0.75);
	});
});

// ---------------------------------------------------------------------------
// Swaps: re-eval a running gmix with a different member set.

const SWAP_AT = SR; // 1 s before the swap
const AFTER = SR; // 1 s after it

interface SwapRun {
	/** The 1 s after the swap. */
	readonly tail: Run;
	/** The state at the swap. */
	readonly swapState: EngineState;
}

function registry(p: Program) {
	return withProgramSpecs(getRegistry(), p);
}

function interpreterSwap(before: Program, after: Program): SwapRun {
	const head = renderTicks(new Core3Engine(before, SR, registry(before)), SWAP_AT);
	const tail = renderTicks(new Core3Engine(after, SR, registry(after), head.state), AFTER);
	return { tail, swapState: head.state };
}

function wasmSwap(before: Program, after: Program): SwapRun {
	const first = createWasmEngine(before, SR, getRegistry());
	const head = renderBlocks(first, SWAP_AT);
	const tail = renderBlocks(swapWasmEngine(after, SR, getRegistry(), first), AFTER);
	return { tail, swapState: head.state };
}

/** The last `AFTER` samples of a `SWAP_AT + AFTER` render, unswapped. */
function lastSecond(run: Run): { l: Float32Array; r: Float32Array } {
	return { l: run.l.subarray(SWAP_AT), r: run.r.subarray(SWAP_AT) };
}

/** Asserts the swapped tail equals the after-patch rendered from t = 0 without a swap. */
function expectPhaseKept(tail: Run, unswapped: Run, label: string): void {
	const ref = lastSecond(unswapped);
	expect(firstBitDiff(ref.l, tail.l), `${label}: lfo phase kept (left)`).toBe(-1);
	expect(firstBitDiff(ref.r, tail.r), `${label}: lfo phase kept (right)`).toBe(-1);
}

const START = "gmix({ a: lfo(0.3), b: 0.2 }).out()";

const SWAPS: readonly { readonly label: string; readonly after: string }[] = [
	{ label: "add a member", after: "gmix({ a: lfo(0.3), b: 0.2, c: 0.1 }).out()" },
	{ label: "remove a member", after: "gmix({ a: lfo(0.3) }).out()" },
	{ label: "rename a member", after: "gmix({ x: lfo(0.3), b: 0.2 }).out()" },
	{ label: "reorder the members", after: "gmix({ b: 0.2, a: lfo(0.3) }).out()" },
];

describe("a port-group re-eval keeps upstream state on both engines", () => {
	for (const s of SWAPS) {
		it(s.label, () => {
			const before = patch(GMIX, START);
			const after = patch(GMIX, s.after);

			const ref = interpreterSwap(before, after);
			const wasm = wasmSwap(before, after);
			expectSameRun(ref.tail, wasm.tail, "wasm after the swap");
			expect(wasm.swapState, "wasm: state at the swap").toEqual(ref.swapState);

			expectPhaseKept(ref.tail, interpreterRun(after, SWAP_AT + AFTER), "interpreter");
			expectPhaseKept(wasm.tail, wasmRun(after, SWAP_AT + AFTER), "wasm");
			expect(Math.max(...ref.tail.l.map(Math.abs))).toBeGreaterThan(0.1);
		});
	}
});
