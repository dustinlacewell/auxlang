/**
 * MANIFESTO §3.3 is normative: every notation form desugars to a combinator.
 * For each row of the table, the notation and its desugaring render identical
 * events.
 */

import { describe, expect, it } from "vitest";

import { silence } from "@/core3/pattern/combinators";
import { p } from "@/core3/pattern/notation/template";
import { P, toP } from "@/core3/pattern/pat-class";
import { evSet, queryCycles } from "../pattern/helpers";

const c4 = 60;
const e4 = 64;
const g4 = 67;
const a4 = 69;
const b4 = 71;

const ROWS: [string, P, P][] = [
	["c4 e4: sequence", p`c4 e4`, P.fastcat(c4, e4)],
	["~: rest", p`c4 ~`, P.fastcat(c4, silence())],
	["[a b]: subdivide one step", p`c4 [e4 g4]`, P.fastcat(c4, P.fastcat(e4, g4))],
	["[a, b]: chord", p`[c4, e4, g4]`, P.stack(c4, e4, g4)],
	["<a b>: alternate per cycle", p`<c4 e4 g4>`, P.cat(c4, e4, g4)],
	[
		"{a b c, d e}: polymeter",
		p`{c4 e4 g4, a4 b4}`,
		P.polymeter(P.fastcat(c4, e4, g4), P.fastcat(a4, b4)),
	],
	["a*2: faster within step", p`c4 [e4 g4]*2`, P.fastcat(c4, P.fastcat(e4, g4).fast(2))],
	["a/2: slower within step", p`c4 [e4 g4]/2`, P.fastcat(c4, P.fastcat(e4, g4).slow(2))],
	["a!2: replicate", p`c4!2 e4`, P.fastcat(c4, c4, e4)],
	["a@2: weight", p`c4@2 e4`, P.timecat([2, c4], [1, e4])],
	["a?: maybe", p`c4*8?`, toP(c4).fast(8).degrade(0.5)],
	["a?0.7: maybe, drop chance", p`c4*8?0.7`, toP(c4).fast(8).degrade(0.7)],
	["a(3,8,2): euclidean", p`c4(3,8,2)`, toP(c4).euclid(3, 8, 2)],
];

describe("notation table (MANIFESTO §3.3)", () => {
	for (const [name, notation, desugared] of ROWS) {
		it(name, () => {
			const want = evSet(queryCycles(desugared.ast, 0, 12, 7));
			expect(want.length).toBeGreaterThan(0);
			expect(evSet(queryCycles(notation.ast, 0, 12, 7))).toEqual(want);
		});
	}

	it.todo("a _: tie, desugars to a then a tie event (rests-and-ties-as-events card)");
});
