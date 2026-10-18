/**
 * Arrays in module state are typed arrays (module/front/state/check-state.ts): a
 * plain array is a loud error at definition naming the module and the
 * field, also inside a record or an array of records; typed arrays and
 * arrays of records pass.
 */

import { describe, expect, it } from "vitest";

import "@/library/all";
import { evalInternal } from "../../testing/internal-module";

function patch(state: string): string {
	return [
		"const t = defineInternalModule({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { in: sig(0) },",
		"  outs: { out: sig() },",
		'  defaultIn: "in",',
		'  defaultOut: "out",',
		`  state: () => (${state}),`,
		"  tick: (s, i, o) => { o.out = i.in; },",
		"})",
		"t().out()",
	].join("\n");
}

const ALLOWED: readonly [string, string][] = [
	["typed arrays", "{ a: new Float32Array(4), b: Int32Array.of(1, 2) }"],
	[
		"an array of records",
		"{ voices: [{ gain: 1, buf: new Float64Array(2) }, { gain: 0, buf: new Float64Array(2) }] }",
	],
	["a record of typed arrays", "{ v: { buf: new Float32Array(3), n: 0 } }"],
];

const REJECTED: readonly [string, string, string][] = [
	["a plain array of numbers", "{ buf: [0, 0, 0] }", "buf"],
	["an empty plain array", "{ buf: [] }", "buf"],
	["a plain array inside a record", "{ v: { taps: [1, 2] } }", "v.taps"],
	["a plain array inside an array of records", "{ vs: [{ h: [0] }] }", "vs[0].h"],
	["an array of typed arrays", "{ lines: [new Float32Array(2)] }", "lines"],
];

describe("tick subset: state arrays", () => {
	for (const [what, state] of ALLOWED)
		it(`allows ${what}`, () => {
			expect(() => evalInternal(patch(state))).not.toThrow();
		});

	for (const [what, state, field] of REJECTED)
		it(`rejects ${what}, naming the module and field`, () => {
			expect(() => evalInternal(patch(state))).toThrow(
				`defmod('t'): state field '${field}' is a plain array — make it a typed array`,
			);
		});
});
