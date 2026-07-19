/**
 * Chord vocabulary: named chords realize to note stacks (voicing) or tone-index
 * patterns (n/set), with register (mode), octave (offset), and inversion
 * (anchor) resolved at build time to plain numbers.
 */

import { describe, expect, it } from "vitest";

import { chord } from "@/core3/pattern/chord/chord";
import { P } from "@/core3/pattern/pat-class";
import { queryCycles } from "./helpers";

const valuesAt = (pat: P, from: number, to: number) =>
	queryCycles(pat.ast, from, to)
		.map((e) => e.value)
		.sort((a, b) => a - b);

describe("voicing", () => {
	it("Bbm9 realizes to its five tones (root bb4)", () => {
		// bb4 = 70; m9 intervals 0,3,7,10,14
		expect(valuesAt(chord("Bbm9").voicing(), 0, 1)).toEqual([70, 73, 77, 80, 84]);
	});

	it("alternates slots per `per` cycles", () => {
		const v = chord("<Bbm9 Fm9>/2").voicing();
		expect(valuesAt(v, 0, 1)).toEqual([70, 73, 77, 80, 84]); // Bbm9
		expect(valuesAt(v, 2, 3)).toEqual([65, 68, 72, 75, 79]); // Fm9 after 2 cycles
	});
});

describe("offset / mode", () => {
	it("offset(-1) drops an octave", () => {
		expect(valuesAt(chord("Bbm9").offset(-1).voicing(), 0, 1)).toEqual([58, 61, 65, 68, 72]);
	});

	it("mode('root:g2') places the root in octave 2", () => {
		// f2 = 41
		expect(valuesAt(chord("Fm9").mode("root:g2").voicing(), 0, 1)).toEqual([41, 44, 48, 51, 55]);
	});
});

describe("anchor", () => {
	it("inverts so the top tone sits at or below the anchor", () => {
		const tones = valuesAt(chord("Bbm9").anchor("D5").voicing(), 0, 1);
		expect(Math.max(...tones)).toBeLessThanOrEqual(74); // D5
		expect(tones).toEqual([58, 61, 65, 68, 72]);
	});
});

describe("n / set", () => {
	it("indexes chord tones, wrapping past the top by octaves", () => {
		expect(queryCycles(chord("Bbm9").n(P.fastcat(0, 1, 2, 7)).ast, 0, 1).map((e) => e.value)).toEqual(
			[70, 73, 77, 89], // 7 mod 5 = 2 (=77) + 1 octave = 89
		);
	});

	it("set(chords) is the argument-flipped n", () => {
		const idx = P.fastcat(0, 1, 2);
		const viaN = chord("Bbm9").n(idx);
		const viaSet = idx.set(chord("Bbm9"));
		expect(queryCycles(viaN.ast, 0, 1).map((e) => e.value)).toEqual(
			queryCycles(viaSet.ast, 0, 1).map((e) => e.value),
		);
	});

	it("unknown chord quality throws, naming the known set", () => {
		expect(() => chord("C13").voicing()).toThrow(/unknown quality/);
	});
});
