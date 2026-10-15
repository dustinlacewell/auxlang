/**
 * Booleans and numbers on WASM, as JS: strict equality between a boolean
 * and a number is false (`!==` true), also in a `switch`, and both sides
 * still run; in a test (`if`, `!`, `?:`) `&&`/`||` may mix the two. Each
 * place where JS would keep a boolean that WASM must hold as a number is a
 * loud compile error instead: a stored boolean, a value that is a boolean on
 * one path and a number on another, a helper returning both, a boolean
 * state field.
 */

import { describe, expect, it } from "vitest";

import { defmod, factory, runProgram } from "@/core3/api";
import type { Program } from "@/core3/types";
import { sig } from "@/core3/types";
import { prepareWasm } from "@/core3/wasm/host/prepare-wasm";
import { firstSlotDifference, interpreterSeries } from "./slot-differential";

const SAMPLES = 200;

function equality(): Program {
	return runProgram(() => {
		const m = defmod({
			name: "be.eq",
			category: "utils",
			ins: { in: sig(0) },
			outs: {
				strict: sig(),
				notStrict: sig(),
				same: sig(),
				sw: sig(),
				effects: sig(),
				test: sig(),
				not: sig(),
				pick: sig(),
			},
			defaultIn: "in",
			defaultOut: "strict",
			state: () => ({ n: 0, m: 0 }),
			tick: (s, i, o) => {
				const n = s.n as number;
				const pos = i.in > 0;
				const one = n % 2;
				o.strict = (pos as unknown) === one ? 1 : 0;
				o.notStrict = (pos as unknown) !== one ? 1 : 0;
				o.same = pos === n % 3 > 0 ? 1 : 0;
				let hits = 0;
				switch (pos as unknown) {
					case 1:
						hits = 10;
						break;
					case true:
						hits = 20;
						break;
					default:
						hits = 30;
				}
				o.sw = hits;
				// biome-ignore lint/suspicious/noAssignInExpressions: the left side's effect must run
				// biome-ignore lint/style/noCommaOperator: a boolean with an effect before it
				o.effects = ((s.m = (s.m as number) + 1), pos as unknown) === 1 ? -1 : (s.m as number);
				if (n % 2 && i.in > 0) o.test = 1;
				else o.test = 0;
				o.not = !((n % 3 && i.in > 0) || n % 5) ? 1 : 0;
				o.pick = n % 4 || pos ? 2 : 3;
				s.n = n + 1;
			},
		});
		m({ in: factory("lfo")(3000) }).out();
	});
}

let failures = 0;

function failing(tick: string, extra: { state?: object; helper?: string } = {}): Program {
	return runProgram(() => {
		const m = defmod({
			name: `be.fail${failures++}`,
			category: "utils",
			ins: { in: sig(0) },
			outs: { out: sig() },
			defaultIn: "in",
			defaultOut: "out",
			state: new Function(
				`return () => (${JSON.stringify({ n: 0, ...extra.state })})`,
			)() as () => Record<string, unknown>,
			helpers:
				extra.helper === undefined
					? {}
					: { h: new Function(`return ${extra.helper}`)() as (x: number) => number },
			tick: new Function(`return ${tick}`)() as never,
		});
		m({ in: factory("lfo")(3000) }).out();
	});
}

describe("WASM booleans and numbers", () => {
	it("compares a boolean with a number as JS does", () => {
		const program = equality();
		expect(firstSlotDifference(program, SAMPLES)).toBeNull();
		const node = program.nodes.findIndex((n) => n.module === "be.eq");
		expect(new Set(interpreterSeries(program, node, "strict", SAMPLES))).toEqual(new Set([0]));
		expect(new Set(interpreterSeries(program, node, "notStrict", SAMPLES))).toEqual(new Set([1]));
		expect(new Set(interpreterSeries(program, node, "sw", SAMPLES))).toEqual(new Set([20, 30]));
		expect(interpreterSeries(program, node, "effects", 3)).toEqual([1, 2, 3]);
	});

	const LOUD: readonly [string, Program, RegExp][] = [
		["a boolean stored in an output", failing("(s, i, o) => { o.out = i.in > 0; }"), /stored/],
		[
			"a boolean stored in a number local",
			failing("(s, i, o) => { let v = 0; v = i.in > 0; o.out = v ? 1 : 0; }"),
			/stored/,
		],
		[
			"a value that is a boolean or a number",
			failing("(s, i, o) => { const v = i.in > 0 ? 1 : false; o.out = v ? 1 : 0; }"),
			/boolean on one path/,
		],
		[
			"&& mixing the two as a value",
			failing("(s, i, o) => { const v = s.n && i.in > 0; o.out = v ? 1 : 0; }"),
			/boolean on one path/,
		],
		[
			"a helper returning both",
			failing("(s, i, o) => { o.out = h(i.in) ? 1 : 0; }", {
				helper: "(x) => { if (x > 0) return true; return 0; }",
			}),
			/returns booleans and numbers/,
		],
		[
			"a boolean state field",
			failing("(s, i, o) => { o.out = s.on ? 1 : 0; }", { state: { on: false } }),
			/no memory form/,
		],
	];
	for (const [what, program, error] of LOUD)
		it(`${what} is a loud compile error`, () => {
			expect(() => prepareWasm(program, 48000)).toThrow(error);
		});
});
