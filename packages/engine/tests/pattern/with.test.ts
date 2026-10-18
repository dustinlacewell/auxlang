/**
 * Pattern records: `p.with({ vel: q })`. Structure comes from `p`; each field
 * takes the value of its pattern's event that holds `p`'s event onset, and is
 * absent where that is a rest. Time and structure combinators keep fields;
 * `.add`/`.mul` change `value` only. `recordFields` names the fields, sorted;
 * layers with different field sets are a loud error.
 */

import { P } from "@/pattern/pat-class";
import { p } from "@/pattern/notation/template";
import { recordFields } from "@/pattern/record-fields";
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

describe("callback combinators keep the fields their transform gives", () => {
	const base = p`c3 e3 g3 b3`;
	const rec = base.with({ vel: p`1` });
	const to03 = (q: P) => q.with({ vel: p`0.3` });
	const fields = (pat: P, from = 0, to = 4) =>
		queryCycles(pat.ast, from, to).map((ev) => ev.fields?.vel);

	it("sometimes: a transformed event takes the transform's fields, the others keep theirs", () => {
		// The same seeded rolls, seen through a value change: transformed events are up an octave.
		const which = queryCycles(base.sometimes((q) => q.add(12)).ast, 0, 4).map((ev) => ev.value >= 60);
		expect(which).toContain(true);
		expect(which).toContain(false);
		expect(fields(rec.sometimes(to03))).toEqual(which.map((up) => (up ? 0.3 : 1)));
	});

	it("always, often, rarely and someBy go through the same path", () => {
		expect(fields(rec.always(to03))).toEqual(Array(16).fill(0.3));
		for (const pat of [rec.often(to03), rec.rarely(to03), rec.someBy(0.4, to03)])
			expect(fields(pat).every((v) => v === 1 || v === 0.3)).toBe(true);
	});

	it("every: the transformed cycles carry the transform's fields", () => {
		expect(fields(rec.every(2, to03), 0, 2)).toEqual([0.3, 0.3, 0.3, 0.3, 1, 1, 1, 1]);
	});

	it("chunk: the transformed slice carries the transform's fields", () => {
		expect(fields(rec.chunk(4, to03), 0, 2)).toEqual([0.3, 1, 1, 1, 1, 0.3, 1, 1]);
	});

	it("off: the shifted copy carries the transform's fields", () => {
		const evs = queryCycles(rec.off(0.125, to03).ast, 0, 1).filter((ev) => ev.whole !== null);
		for (const ev of evs) expect(ev.fields?.vel).toBe(ev.lane === 1 ? 0.3 : 1);
		expect(evs.some((ev) => ev.lane === 1)).toBe(true);
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
