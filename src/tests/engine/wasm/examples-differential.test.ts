/**
 * The WASM gate: every site, module-docs, pattern-docs and doc-snippet
 * example compiles to WASM and reproduces the interpreter bit for bit —
 * every output sample, and every lane state after the render (harness:
 * differential-harness.ts). The interpreter ticks per sample; WASM renders
 * in uneven blocks, so state kept in locals and memory must be exact at
 * every block end. An example that does not compile fails here. A re-eval
 * swap, carried memory to memory as the worklet carries it, matches the
 * interpreter's swap. Determinism is a project invariant, so any divergence
 * is a backend bug.
 */

import "@/engine/library/all";

import { compile, out, runEval } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { EngineState, Program } from "@/engine/types";
import { sig } from "@/engine/types";
import { createWasmEngine, swapWasmEngine } from "@/engine/wasm/host/create-wasm-engine";
import { EXAMPLES as SITE } from "@/ui/editor/examples";
import { evalPatch } from "@/engine/eval-patch";
import { EXAMPLES as MODULE_DOCS } from "@/ui/module-docs/examples";
import { EXAMPLES as PATTERN_DOCS } from "@/ui/pattern-docs/examples";
import { CHAPTERS as MODULE_DSP_CHAPTERS } from "@/ui/site/module-dsp/bricks";
import { describe, expect, it } from "vitest";
import { defineInternalModule } from "../fixtures/internal-module";
import { SNIPPETS } from "../snippets";
import {
	type Run,
	SR,
	expectIdentical,
	expectSameRun,
	renderBlocks,
	renderTicks,
} from "./differential-harness";

const SAMPLES = SR; // 1 s
const HALF = SAMPLES / 2;

interface SwapRun extends Run {
	/** The state at the swap. */
	readonly swapState: EngineState;
}

/** The two halves as one run. */
function joined(head: Run, tail: Run): SwapRun {
	const l = new Float32Array(SAMPLES);
	const r = new Float32Array(SAMPLES);
	l.set(head.l);
	l.set(tail.l, HALF);
	r.set(head.r);
	r.set(tail.r, HALF);
	return { l, r, state: tail.state, swapState: head.state };
}

/** The interpreter: `before` for 0.5 s, then `after` continuing its state for 0.5 s. */
function interpreterSwap(before: Program, after: Program): SwapRun {
	const registry = (p: Program) => withProgramSpecs(getRegistry(), p);
	const head = renderTicks(new Core3Engine(before, SR, registry(before)), HALF);
	const tail = renderTicks(new Core3Engine(after, SR, registry(after), head.state), HALF);
	return joined(head, tail);
}

/** WASM: `before` for 0.5 s, then `after` prepared against it and carried memory to memory. */
function wasmSwap(before: Program, after: Program): SwapRun {
	const first = createWasmEngine(before, SR, getRegistry());
	const head = renderBlocks(first, HALF);
	const tail = renderBlocks(swapWasmEngine(after, SR, getRegistry(), first), HALF);
	return joined(head, tail);
}

const EXAMPLES: readonly { readonly label: string; readonly code: string }[] = [
	...SITE.map((e) => ({ label: `site: ${e.name}`, code: e.source })),
	...MODULE_DOCS.map((e) => ({ label: `module-docs [${e.section}] ${e.title}`, code: e.code })),
	...PATTERN_DOCS.map((e) => ({ label: `pattern-docs [${e.section}] ${e.title}`, code: e.code })),
];

const MODULE_DSP_CASES = MODULE_DSP_CHAPTERS.flatMap((chapter) =>
	chapter.bricks.map((brick, i) => ({
		label: `module-dsp [${chapter.title}] brick ${i + 1}`,
		code: brick.code,
	})),
);

const CASES = [
	...EXAMPLES,
	...SNIPPETS.map((s) => ({ label: `snippet: ${s.id}`, code: s.code })),
	...MODULE_DSP_CASES,
];

describe("WASM is bit-identical to the interpreter", () => {
	it("covers every example set", () => {
		expect(EXAMPLES.length).toBe(SITE.length + MODULE_DOCS.length + PATTERN_DOCS.length);
		expect(CASES.length).toBe(EXAMPLES.length + SNIPPETS.length + MODULE_DSP_CASES.length);
	});

	for (const c of CASES) {
		it(c.label, () => expectIdentical(evalPatch(c.code), SAMPLES));
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

		const ref = interpreterSwap(before, after);
		const wasm = wasmSwap(before, after);
		expectSameRun(ref, wasm, "wasm");
		expect(wasm.swapState, "wasm: state at the swap").toEqual(ref.swapState);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it("a patch-defined module with a hostile port name stays data, not code", () => {
		const hostile = '"]; globalThis.__portPwned = 1; //';
		const program = compile(
			runEval(() => {
				const echo = defineInternalModule({
					name: "echoport",
					category: "effects",
					ins: { in: sig(0), [hostile]: sig(0) },
					outs: { out: sig(), [hostile]: sig() },
					defaultIn: hostile,
					defaultOut: "out",
					positional: [hostile, "in"],
					// A tick cannot name a hostile port (string keys are outside the tick
					// subset), but the ports still cross to the backend as data.
					tick: (_s, i, o) => {
						o.out = Math.sin(i.in * 0.01);
					},
				});
				const ramp = (_s: unknown, _sr: number, t: number) => t * 4400;
				out(echo(ramp, ramp).mul(0.3));
			}),
		);
		const ref = expectIdentical(JSON.parse(JSON.stringify(program)) as Program, SAMPLES);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
		expect((globalThis as Record<string, unknown>).__portPwned).toBeUndefined();
	});
});
