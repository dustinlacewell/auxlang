/**
 * Every site, module-docs, pattern-docs and doc-snippet example is bit-exact
 * across an unchanged re-eval (MANIFESTO §6.2): state and the feedback sample
 * both carry, so the swapped engine continues exactly where the old one was.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { EngineState, Program } from "@/core3/types";
import { EXAMPLES as SITE } from "@/ui/core3-editor/examples";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { EXAMPLES as MODULE_DOCS } from "@/ui/module-docs/examples";
import { EXAMPLES as PATTERN_DOCS } from "@/ui/pattern-docs/examples";
import { expect, it } from "vitest";
import { SNIPPETS } from "../../../../docs/snippets";

const SR = 48000;
const SPAN = SR / 10;

const CASES: readonly { readonly label: string; readonly code: string }[] = [
	...SITE.map((e) => ({ label: `site: ${e.name}`, code: e.source })),
	...MODULE_DOCS.map((e) => ({ label: `module-docs: ${e.title}`, code: e.code })),
	...PATTERN_DOCS.map((e) => ({ label: `pattern-docs: ${e.title}`, code: e.code })),
	...SNIPPETS.map((s) => ({ label: `snippet: ${s.id}`, code: s.code })),
];

function build(program: Program, prev?: EngineState): Core3Engine {
	return new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program), prev);
}

function run(engine: Core3Engine, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		out.push(frame[0] as number, frame[1] as number);
	}
	return out;
}

it("every example is bit-exact across an unchanged re-eval", () => {
	const drifting = CASES.filter(({ code }) => {
		const reference = build(evalPatch(code));
		run(reference, SPAN);
		const expected = run(reference, SPAN);
		const first = build(evalPatch(code));
		run(first, SPAN);
		const got = run(build(evalPatch(code), first.collectState()), SPAN);
		return got.some((v, i) => !Object.is(v, expected[i]));
	});
	expect(drifting.map((c) => c.label)).toEqual([]);
}, 60_000);
