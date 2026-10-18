/**
 * The rewrite does not change meaning (MANIFESTO §10.1): for every site,
 * module-docs, pattern-docs and doc-snippet example, the Program evaluated
 * from the rewritten code equals the one evaluated from the code as written,
 * once the site metadata is dropped, and both render bit for bit the same.
 */

import "@/engine/library/all";

import { buildUserScope, compile, runEval } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { withSourceText } from "@/engine/dsp/source-text";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { Program } from "@/engine/types";
import { EXAMPLES as SITE } from "@/ui/editor/examples";
import { evalPatch } from "@/engine/eval-patch";
import { EXAMPLES as MODULE_DOCS } from "@/ui/module-docs/examples";
import { EXAMPLES as PATTERN_DOCS } from "@/ui/pattern-docs/examples";
import { expect, it } from "vitest";
import { SNIPPETS } from "../snippets";

const SR = 48000;
const SAMPLES = SR / 4;

const CASES: readonly { readonly label: string; readonly code: string }[] = [
	...SITE.map((e) => ({ label: `site: ${e.name}`, code: e.source })),
	...MODULE_DOCS.map((e) => ({ label: `module-docs: ${e.title}`, code: e.code })),
	...PATTERN_DOCS.map((e) => ({ label: `pattern-docs: ${e.title}`, code: e.code })),
	...SNIPPETS.map((s) => ({ label: `snippet: ${s.id}`, code: s.code })),
];

const SCOPE = buildUserScope();
const NAMES = Object.keys(SCOPE);
const VALUES = NAMES.map((name) => SCOPE[name]);

/** The patch evaluated exactly as written: no rewrite, no trace, no location tables. */
function evalWithoutRewrite(source: string): Program {
	const patch = new Function(...NAMES, source) as (...args: unknown[]) => void;
	return withSourceText({ file: "patch", text: source }, () =>
		compile(runEval(() => patch(...VALUES))),
	);
}

/** The Program with every source site dropped (nodes, bindings, pattern leaves). */
function withoutSites(program: Program): unknown {
	return JSON.parse(
		JSON.stringify(program, (key, value) =>
			key === "site" || key === "bindingSites" ? undefined : value,
		),
	);
}

function render(program: Program): Float32Array {
	const engine = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
	const out = new Float32Array(SAMPLES * 2);
	const frame = new Float32Array(2);
	for (let i = 0; i < SAMPLES; i++) {
		engine.tick(frame);
		out[2 * i] = frame[0] as number;
		out[2 * i + 1] = frame[1] as number;
	}
	return out;
}

it("every example evaluates to the same Program with and without the rewrite", () => {
	const differing = CASES.filter(
		({ code }) =>
			JSON.stringify(withoutSites(evalPatch(code))) !==
			JSON.stringify(withoutSites(evalWithoutRewrite(code))),
	);
	expect(differing.map((c) => c.label)).toEqual([]);
}, 60_000);

it("every example renders bit for bit the same with and without the rewrite", () => {
	const differing = CASES.filter(({ code }) => {
		const a = render(evalPatch(code));
		const b = render(evalWithoutRewrite(code));
		return a.some((v, i) => !Object.is(v, b[i]));
	});
	expect(differing.map((c) => c.label)).toEqual([]);
}, 120_000);

it("the rewrite is not a no-op: the examples do carry sites", () => {
	const program = evalPatch(CASES[0]?.code ?? "");
	expect(program.nodes.some((n) => n.site !== undefined)).toBe(true);
});
