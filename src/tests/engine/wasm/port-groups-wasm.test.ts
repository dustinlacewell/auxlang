/**
 * Port groups on WASM: a defmod with an in-group or an out-group renders
 * bit-identical to the interpreter for 8 s, at width 1 and width 2, and a
 * re-eval that adds, removes, renames or reorders a member keeps the
 * upstream lfo's phase on both engines while the two engines stay identical.
 */

import "@/engine/library/all";

import { getRegistry } from "@/engine/dsp/define";
import { InterpreterEngine } from "@/engine/runtime/interpreter-engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { renderTap } from "@/engine/runtime/render";
import type { EngineState, Program } from "@/engine/types";
import { createWasmEngine, swapWasmEngine } from "@/engine/wasm/host/create-wasm-engine";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "../bridge/helpers";
import { evalInternal } from "../fixtures/internal-module";
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
		`const ${name} = defineInternalModule({`,
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
	"const gfan = defineInternalModule({",
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
	return evalInternal(lines.join("\n"));
}

/** The largest absolute sample (a loop: spreading 384000 samples into Math.max overflows the stack). */
function peak(samples: Float32Array): number {
	let max = 0;
	for (const v of samples) max = Math.max(max, Math.abs(v));
	return max;
}

/** The module's own output at sample 0: `out` scales and DC-blocks the frame. */
function firstSample(program: Program, module: string): number {
	return renderTap(program, nodeIndex(program, module), "out", 0, 1)[0] as number;
}

describe("port groups on WASM are bit-identical to the interpreter (8 s)", () => {
	it("constant members with a level setter; sample 0 is 1", () => {
		const program = patch(GMIX, "gmix({ a: 0.5, b: 0.25 }).level({ b: 2 }).out()");
		expectIdentical(program, EIGHT_SECONDS);
		expect(firstSample(program, "gmix")).toBe(1);
	});

	it("signal members with .mod on a member level", () => {
		const ref = expectIdentical(
			patch(GMIX, 'gmix({ a: sin(60), b: tri(67) }).mod("level.b", lfo(0.3, -1, 1), 1).out()'),
			EIGHT_SECONDS,
		);
		expect(peak(ref.l)).toBeGreaterThan(0.01);
	});

	it("one member; its unset like-member takes the default level 1", () => {
		const ref = expectIdentical(patch(GMIX, "gmix({ a: lfo(0.2) }).out()"), EIGHT_SECONDS);
		expect(peak(ref.l)).toBeGreaterThan(0.01);
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
		expect(peak(ref.l)).toBeGreaterThan(0.01);
		expect(peak(ref.r)).toBeGreaterThan(0.01);
		expect(firstBitDiff(ref.l, ref.r)).not.toBe(-1);
	});

	it("width 2: a member driven by a two-lane stack", () => {
		const ref = expectIdentical(
			patch(GMIX, "tempo(120)", "gmix({ a: sin(p`[60, 67]`), b: 0.1 }).out()"),
			EIGHT_SECONDS,
		);
		expect(peak(ref.l)).toBeGreaterThan(0.01);
	});

	it("i.ch.length read into a local and used in arithmetic: 3 members give 0.75", () => {
		const glen = defIn("glen", "const n = i.ch.length; o.out = n * 0.25;");
		const program = patch(glen, "glen({ a: 0.1, b: 0.2, c: 0.3 }).out()");
		expectIdentical(program, EIGHT_SECONDS);
		expect(firstSample(program, "glen")).toBe(0.75);
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
	const head = renderTicks(new InterpreterEngine(before, SR, registry(before)), SWAP_AT);
	const tail = renderTicks(new InterpreterEngine(after, SR, registry(after), head.state), AFTER);
	return { tail, swapState: head.state };
}

function wasmSwap(before: Program, after: Program): SwapRun {
	const first = createWasmEngine(before, SR, getRegistry());
	const head = renderBlocks(first, SWAP_AT);
	const tail = renderBlocks(swapWasmEngine(after, SR, getRegistry(), first), AFTER);
	return { tail, swapState: head.state };
}

/** The lfo's lane states. */
function lfoState(state: EngineState): Record<string, unknown>[] | undefined {
	const id = state.identities.find((i) => i.kind === "lfo");
	return id === undefined ? undefined : state.nodes[id.key];
}

/**
 * Asserts the lfo's state after the swap equals an unswapped render's at the
 * same time: its phase ran on. The output cannot show it: `out` DC-blocks,
 * so a changed constant member leaves a transient in the frame.
 */
function expectPhaseKept(tail: Run, unswapped: Run, label: string): void {
	const kept = lfoState(tail.state);
	expect(kept, `${label}: the lfo is running`).toBeDefined();
	expect(kept, `${label}: lfo phase kept`).toEqual(lfoState(unswapped.state));
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
			expect(peak(ref.tail.l)).toBeGreaterThan(0.01);
		});
	}
});
