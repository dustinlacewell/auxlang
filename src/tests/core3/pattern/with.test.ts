/**
 * Pattern records: `p.with({ vel: q })`. Structure comes from `p`; each field
 * takes the value of its pattern's event that holds `p`'s event onset, and is
 * absent where that is a rest. Time and structure combinators keep fields;
 * `.add`/`.mul` change `value` only. `recordFields` names the fields, sorted;
 * layers with different field sets are a loud error.
 */

import { P } from "@/core3/pattern/pat-class";
import { p } from "@/core3/pattern/notation/template";
import { recordFields } from "@/core3/pattern/record-fields";
import { describe, expect, it } from "vitest";
import { queryCycles } from "./helpers";

const vel = (pat: P, from = 0, to = 1) => queryCycles(pat.ast, from, to).map((ev) => ev.fields?.vel);

describe("p.with", () => {
	const rec = p`c3 e3 g3 b3`.with({ vel: p`1 0.4 0.7` });

	it("samples each field at the onsets of the left pattern", () => {
		const evs = queryCycles(rec.ast, 0, 1);
		expect(evs.map((ev) => ev.value)).toEqual([48, 52, 55, 59]);
		expect(evs.map((ev) => ev.fields?.vel)).toEqual([1, 1, 0.4, 0.7]);
	});

	it("fast keeps the fields; add changes the value, not the fields", () => {
		expect(vel(rec.fast(2))).toEqual([1, 1, 0.4, 0.7, 1, 1, 0.4, 0.7]);
		const up = queryCycles(rec.add(12).ast, 0, 1);
		expect(up.map((ev) => ev.value)).toEqual([60, 64, 67, 71]);
		expect(up.map((ev) => ev.fields?.vel)).toEqual([1, 1, 0.4, 0.7]);
	});

	it("a rest in the field pattern leaves the field absent", () => {
		expect(vel(p`c3 e3`.with({ vel: p`~ 0.5` }))).toEqual([undefined, 0.5]);
	});

	it("two fields sample independently", () => {
		const evs = queryCycles(
			p`c3 e3 g3 b3`.with({ vel: p`1 0.5`, cv2: p`0.1 0.2 0.3 0.4` }).ast,
			0,
			1,
		);
		expect(evs.map((ev) => ev.fields?.vel)).toEqual([1, 1, 0.5, 0.5]);
		expect(evs.map((ev) => ev.fields?.cv2)).toEqual([0.1, 0.2, 0.3, 0.4]);
	});

	it("a field name must be an identifier", () => {
		expect(() => p`c3`.with({ "a-b": p`1` })).toThrow(/a-b/);
	});
});

describe("recordFields", () => {
	it("names the fields, sorted; none without a with", () => {
		expect(recordFields(p`c3`.with({ vel: p`1`, cv2: p`2` }).ast)).toEqual(["cv2", "vel"]);
		expect(recordFields(p`c3 e3`.ast)).toEqual([]);
	});

	it("layers with different field sets are a loud error naming both", () => {
		const stacked = P.stack(p`c3`.with({ vel: p`1` }), p`e3`);
		expect(() => recordFields(stacked.ast)).toThrow(/\[vel\].*\[\]/);
	});
});
