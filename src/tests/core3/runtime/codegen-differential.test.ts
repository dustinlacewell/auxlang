/**
 * The codegen gate: for every site, module-docs, pattern-docs, and doc-snippet
 * example, the generated driver must reproduce the interpreter bit for bit —
 * every output sample, and every lane state after the render. Determinism is
 * a project invariant, so any divergence is a generator bug.
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
	const engine = new Core3Engine(program, SR, registry, undefined, { codegen });
	const l = new Float32Array(SAMPLES);
	const r = new Float32Array(SAMPLES);
	const frame = new Float32Array(2);
	for (let i = 0; i < SAMPLES; i++) {
		engine.tick(frame);
		l[i] = frame[0] as number;
		r[i] = frame[1] as number;
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
		it(c.label, () => expectIdentical(evalPatch(c.code)));
	}

	it("a patch-defined module with a hostile port name stays data, not code", () => {
		const hostile = '"]; globalThis.__codegenPwned = 1; //';
		const program = compile(
			runEval(() => {
				const echo = defmod({
					name: "echoport",
					category: "effects",
					ins: { [hostile]: sig(0) },
					outs: { [hostile]: sig() },
					defaultIn: hostile,
					defaultOut: hostile,
					positional: [hostile],
					// Closure-free (serialized across the boundary), so it cannot name `hostile`.
					tick: (_s, i, o) => {
						const ins = i as Record<string, number>;
						const outs = o as Record<string, number>;
						for (const k of Object.keys(ins)) outs[k] = Math.sin((ins[k] as number) * 0.01);
					},
				});
				out(echo((_s: unknown, _sr: number, t: number) => t * 4400).mul(0.3));
			}),
		);
		const ref = expectIdentical(JSON.parse(JSON.stringify(program)) as Program);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
		expect((globalThis as Record<string, unknown>).__codegenPwned).toBeUndefined();
	});
});
