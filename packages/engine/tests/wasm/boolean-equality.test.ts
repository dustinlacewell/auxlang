/**
 * Booleans and numbers on WASM, as JS: strict equality between a boolean
 * and a number is false (`!==` true), also in a `switch`, and both sides
 * still run. Every boolean use the shared checker allows (module/front/kinds/)
 * compiles and matches: booleans in their own variables, in typed arrays,
 * from helpers, and mixed with numbers where only truthiness counts.
 */

import { describe, expect, it } from "vitest";

import { factory, runProgram } from "@/api";
import type { Program } from "@/types";
import { sig } from "@/types";
import { defineInternalModule, evalInternal } from "../../testing/internal-module";
import { firstSlotDifference, interpreterSeries } from "./slot-differential";

const SAMPLES = 200;

function equality(): Program {
	return runProgram(() => {
		const m = defineInternalModule({
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

/** A module whose tick holds `body`, fed a fast lfo, through the patch path. */
function allowed(body: string): Program {
	return evalInternal(`const b = defineInternalModule({
  name: "be.ok",
  category: "utils",
  ins: { in: sig(0) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: () => ({ n: 0, buf: new Float32Array(2) }),
  helpers: { pos: (x) => x > 0 },
  tick: (s, i, o) => {
    ${body}
    s.n = (s.n + 1) % 7;
  },
})
b({ in: lfo(3000) }).out()`);
}

/** Booleans the checker allows (module/front/kinds/): each compiles and matches. */
const ALLOWED: readonly [string, string][] = [
	["a boolean let given booleans", "let on = false; on = i.in > 0; o.out = on ? 1 : 0;"],
	["a mix in an if", "o.out = 0; if (s.n && i.in > 0) o.out = 1;"],
	["a mix in a ?: test", "o.out = (s.n || i.in > 0) ? 1 : 2;"],
	["a mix under !", "o.out = !(s.n && i.in > 0) ? 1 : 0;"],
	["a mix in a loop test", "let k = 0; while (k < 3 && (s.n || i.in > 0)) k++; o.out = k;"],
	["a boolean stored in a typed array", "s.buf[0] = i.in > 0; o.out = s.buf[0];"],
	["a helper returning booleans", "o.out = pos(i.in) ? 1 : 0;"],
];

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

	for (const [what, body] of ALLOWED)
		it(`${what}: compiles and matches the interpreter`, () => {
			expect(firstSlotDifference(allowed(body), SAMPLES)).toBeNull();
		});
});
