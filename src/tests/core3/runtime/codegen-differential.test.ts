/**
 * The codegen gate: for every site, module-docs, pattern-docs, and doc-snippet
 * example, the generated driver must reproduce the interpreter bit for bit —
 * every output sample, and every lane state after the render. The interpreter
 * ticks per sample; the generated driver renders in uneven blocks, so state
 * kept in locals must be stored back exactly at every block end. Determinism
 * is a project invariant, so any divergence is a generator bug.
 */

import "@/core3/modules/all";

import { compile, defmod, out, runEval } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { EngineState, Program } from "@/core3/types";
import { sig } from "@/core3/types";
import { EXAMPLES as SITE } from "@/ui/core3-editor/examples";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { EXAMPLES as MODULE_DOCS } from "@/ui/module-docs/examples";
import { EXAMPLES as PATTERN_DOCS } from "@/ui/pattern-docs/examples";
import { describe, expect, it } from "vitest";
import { SNIPPETS } from "../../../../docs/snippets";

const SR = 48000;
const SAMPLES = SR; // 1 s

interface Run {
	readonly l: Float32Array;
	readonly r: Float32Array;
	readonly state: EngineState;
}

function run(program: Program, codegen: boolean): Run {
	const registry = withProgramSpecs(getRegistry(), program);
	return render(new Core3Engine(program, SR, registry, undefined, { codegen }), SAMPLES, codegen);
}

interface SwapRun extends Run {
	/** The state migrated at the swap. */
	readonly swapState: EngineState;
}

/** Render `before` for 0.5 s, then swap to `after` with its migrated state for 0.5 s. */
function swapRun(before: Program, after: Program, codegen: boolean): SwapRun {
	const half = SAMPLES / 2;
	const first = new Core3Engine(before, SR, withProgramSpecs(getRegistry(), before), undefined, {
		codegen,
	});
	const head = render(first, half, codegen);
	const registry = withProgramSpecs(getRegistry(), after);
	const second = new Core3Engine(after, SR, registry, head.state, { codegen });
	const tail = render(second, half, codegen);
	const l = new Float32Array(SAMPLES);
	const r = new Float32Array(SAMPLES);
	l.set(head.l);
	l.set(tail.l, half);
	r.set(head.r);
	r.set(tail.r, half);
	return { l, r, state: tail.state, swapState: head.state };
}

/**
 * Block sizes the generated driver renders in, cycled: the worklet quantum
 * plus odd sizes, so state stored back at block ends is crossed often and at
 * uneven points.
 */
const BLOCKS = [128, 1, 77, 128, 3, 128, 64];

/** The interpreter ticks one sample at a time (the reference); codegen renders in blocks. */
function render(engine: Core3Engine, samples: number, codegen: boolean): Run {
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	if (!codegen) {
		const frame = new Float32Array(2);
		for (let i = 0; i < samples; i++) {
			engine.tick(frame);
			l[i] = frame[0] as number;
			r[i] = frame[1] as number;
		}
		return { l, r, state: engine.collectState() };
	}
	for (let at = 0, b = 0; at < samples; b++) {
		const n = Math.min(BLOCKS[b % BLOCKS.length] as number, samples - at);
		engine.renderBlock(l, r, at, n);
		at += n;
	}
	return { l, r, state: engine.collectState() };
}

/** Index of the first sample whose bits differ; -1 when identical. */
function firstBitDiff(a: Float32Array, b: Float32Array): number {
	const ua = new Uint32Array(a.buffer);
	const ub = new Uint32Array(b.buffer);
	for (let i = 0; i < ua.length; i++) if (ua[i] !== ub[i]) return i;
	return -1;
}

/** Asserts both drivers agree; returns the interpreter's run. */
function expectIdentical(program: Program): Run {
	const ref = run(program, false);
	const gen = run(program, true);
	expect(firstBitDiff(ref.l, gen.l), "first differing left sample").toBe(-1);
	expect(firstBitDiff(ref.r, gen.r), "first differing right sample").toBe(-1);
	expect(gen.state).toEqual(ref.state);
	return ref;
}

const CASES: readonly { readonly label: string; readonly code: string }[] = [
	...SITE.map((e) => ({ label: `site: ${e.name}`, code: e.source })),
	...MODULE_DOCS.map((e) => ({ label: `module-docs [${e.section}] ${e.title}`, code: e.code })),
	...PATTERN_DOCS.map((e) => ({ label: `pattern-docs [${e.section}] ${e.title}`, code: e.code })),
	...SNIPPETS.map((s) => ({ label: `snippet: ${s.id}`, code: s.code })),
];

describe("codegen driver is bit-identical to the interpreter", () => {
	it("covers every example set", () => {
		expect(CASES.length).toBe(
			SITE.length + MODULE_DOCS.length + PATTERN_DOCS.length + SNIPPETS.length,
		);
	});

	for (const c of CASES) {
		// Each case renders 1 s twice; heavy patches near 5 s under parallel load.
		it(c.label, () => expectIdentical(evalPatch(c.code)), 20_000);
	}

	it("a re-eval swap with migrated state (seq, lpf cutoff edit, delay)", () => {
		const patch = (cutoff: number) =>
			evalPatch(`tempo(120)
const s = seq("c3 e3 g3 b3")
s.saw()
  .lpf(${cutoff})
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .delay({ time: 0.15, feedback: 0.4, mix: 0.3 })
  .gain(0.3)
  .out()`);
		const before = patch(800);
		const after = patch(1400);
		expect(after.nodes.map((n) => n.place)).toEqual(before.nodes.map((n) => n.place));

		const ref = swapRun(before, after, false);
		const gen = swapRun(before, after, true);
		expect(firstBitDiff(ref.l, gen.l), "first differing left sample").toBe(-1);
		expect(firstBitDiff(ref.r, gen.r), "first differing right sample").toBe(-1);
		expect(gen.swapState).toEqual(ref.swapState);
		expect(gen.state).toEqual(ref.state);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it("a patch-defined module with a hostile port name stays data, not code", () => {
		const hostile = '"]; globalThis.__codegenPwned = 1; //';
		const program = compile(
			runEval(() => {
				const echo = defmod({
					name: "echoport",
					category: "effects",
					ins: { in: sig(0), [hostile]: sig(0) },
					outs: { out: sig(), [hostile]: sig() },
					defaultIn: hostile,
					defaultOut: "out",
					positional: [hostile, "in"],
					// A tick cannot name a hostile port (string keys are outside the tick
					// subset), but the ports still cross the generated driver as data.
					tick: (_s, i, o) => {
						o.out = Math.sin(i.in * 0.01);
					},
				});
				const ramp = (_s: unknown, _sr: number, t: number) => t * 4400;
				out(echo(ramp, ramp).mul(0.3));
			}),
		);
		const ref = expectIdentical(JSON.parse(JSON.stringify(program)) as Program);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
		expect((globalThis as Record<string, unknown>).__codegenPwned).toBeUndefined();
	});
});
