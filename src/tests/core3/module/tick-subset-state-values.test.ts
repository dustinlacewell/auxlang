/**
 * Module state holds only values every backend can hold (module/front/
 * state/check-state.ts): a field with no number form, or an array of records of
 * differing shapes, is a loud error at definition naming the module and the
 * field, so the WASM layout holds every field the state shape has.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { evalInternal } from "../fixtures/internal-module";

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

const NO_FORM: readonly [string, string, string, string][] = [
	["a string", '{ mode: "a" }', "mode", "a string"],
	["null", "{ last: null }", "last", "null"],
	["undefined", "{ last: undefined }", "last", "a undefined"],
	["a BigInt array", "{ b: new BigInt64Array(2) }", "b", "a BigInt64Array"],
	["a string inside a record", '{ v: { name: "x", n: 0 } }', "v.name", "a string"],
];

describe("tick subset: state values", () => {
	for (const [what, state, field, kind] of NO_FORM)
		it(`rejects ${what}, naming the module and field`, () => {
			expect(() => evalInternal(patch(state))).toThrow(
				`defmod('t'): state field '${field}' is ${kind} — state holds numbers, typed arrays, records and arrays of records`,
			);
		});

	it("rejects records of differing shapes in one array", () => {
		expect(() => evalInternal(patch("{ vs: [{ a: 0 }, { b: 0 }] }"))).toThrow(
			"defmod('t'): state field 'vs' holds records of differing shapes",
		);
		expect(() =>
			evalInternal(patch("{ vs: [{ a: new Float32Array(2) }, { a: new Float32Array(3) }] }")),
		).toThrow("holds records of differing shapes");
	});
});
