/**
 * Every site, module-docs, pattern-docs and doc-snippet example is bit-exact
 * across an unchanged re-eval (MANIFESTO §6.2): state and the feedback sample
 * both carry, so the swapped engine continues exactly where the old one was.
 * On the interpreter and on WASM (backends.ts).
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { Program } from "@/core3/types";
import { EXAMPLES as SITE } from "@/ui/core3-editor/examples";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { EXAMPLES as MODULE_DOCS } from "@/ui/module-docs/examples";
import { EXAMPLES as PATTERN_DOCS } from "@/ui/pattern-docs/examples";
import { expect, it } from "vitest";
import { SNIPPETS } from "../../../../docs/snippets";
import { BACKENDS, type TestEngine } from "./backends";

const SR = 48000;
const SPAN = SR / 10;

const CASES: readonly { readonly label: string; readonly code: string }[] = [
	...SITE.map((e) => ({ label: `site: ${e.name}`, code: e.source })),
	...MODULE_DOCS.map((e) => ({ label: `module-docs: ${e.title}`, code: e.code })),
	...PATTERN_DOCS.map((e) => ({ label: `pattern-docs: ${e.title}`, code: e.code })),
	...SNIPPETS.map((s) => ({ label: `snippet: ${s.id}`, code: s.code })),
];

function run(engine: TestEngine, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		out.push(frame[0] as number, frame[1] as number);
	}
	return out;
}

it.each(BACKENDS)(
	"every example is bit-exact across an unchanged re-eval ($name)",
	(backend) => {
		const registry = (program: Program) => withProgramSpecs(getRegistry(), program);
		const build = (program: Program) => backend.create(program, SR, registry(program));
		const drifting = CASES.filter(({ code }) => {
			const reference = build(evalPatch(code));
			run(reference, SPAN);
			const expected = run(reference, SPAN);
			const first = build(evalPatch(code));
			run(first, SPAN);
			const next = evalPatch(code);
			const got = run(backend.swap(next, SR, registry(next), first), SPAN);
			return got.some((v, i) => !Object.is(v, expected[i]));
		});
		expect(drifting.map((c) => c.label)).toEqual([]);
	},
	120_000,
);
