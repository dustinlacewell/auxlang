/**
 * Unit tags (MANIFESTO §2): `hz(x)`, `semis(x)`, `secs(x)`, `beats(x)` say a
 * value is in that unit and the receiving port converts it. Filter cutoff is
 * in semitones; `period(pitch)` gives seconds per cycle.
 */

import "@/core3/modules/all";

import { defmod, factory, runProgram, tempo } from "@/core3/api";
import { render, renderTap } from "@/core3/runtime/render";
import { sig, unit } from "@/core3/types";
import { hzToSemis } from "@/core3/units/pitch";
import { beats, hz, semis } from "@/core3/units/tag";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

const saw = factory("saw");
const lfo = factory("lfo");
const period = factory("period");

const SECONDS = 0.1;

/** The pre-semitone lpf, verbatim (cutoff in Hz), as a patch-defined module. */
function defineHzLpf(): void {
	defmod({
		name: "hzlpf",
		category: "filters",
		ins: { in: sig(0), cutoff: hz(1000), res: unit(0) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["cutoff", "res"],
		state: () => ({ ic1: 0, ic2: 0, lastCut: -1, lastRes: -1, a1: 0, a2: 0, a3: 0, k: 0 }),
		tick: (s, i, o, _cfg, sr) => {
			const cutoff = Math.min(i.cutoff, 0.49 * sr);
			const res = i.res;
			if (cutoff !== (s.lastCut as number) || res !== (s.lastRes as number)) {
				const g = Math.tan((Math.PI * cutoff) / sr);
				const k = 1 / (0.5 + res * 9.5);
				const a1 = 1 / (1 + g * (g + k));
				s.k = k;
				s.a1 = a1;
				s.a2 = g * a1;
				s.a3 = g * (g * a1);
				s.lastCut = cutoff;
				s.lastRes = res;
			}
			const ic1 = s.ic1 as number;
			const ic2 = s.ic2 as number;
			const v3 = i.in - ic2;
			const v1 = (s.a1 as number) * ic1 + (s.a2 as number) * v3;
			const v2 = ic2 + (s.a2 as number) * ic1 + (s.a3 as number) * v3;
			s.ic1 = 2 * v1 - ic1;
			s.ic2 = 2 * v2 - ic2;
			o.out = v2;
		},
	});
}

const renderL = (fn: () => void) => render(runProgram(fn), SECONDS).l;

describe("filter cutoff in semitones", () => {
	it("lpf({ cutoff: 69 }) matches the old Hz lpf at cutoff 440", () => {
		const semitone = renderL(() => saw(45).lpf({ cutoff: 69, res: 0.3 }).out());
		const old = renderL(() => {
			defineHzLpf();
			saw(45).hzlpf({ cutoff: 440, res: 0.3 }).out();
		});
		expect(semitone).toEqual(old);
	});

	it("lpf({ cutoff: hz(440) }) equals lpf({ cutoff: 69 })", () => {
		const tagged = renderL(() =>
			saw(45)
				.lpf({ cutoff: hz(440) })
				.out(),
		);
		const plain = renderL(() => saw(45).lpf({ cutoff: 69 }).out());
		expect(tagged).toEqual(plain);
	});
});

describe("unit tags convert at the port", () => {
	it("a tagged signal converts per sample: hz(lfo(...)) into cutoff", () => {
		const program = runProgram(() => {
			saw(45)
				.lpf({ cutoff: hz(lfo(5, 200, 2000)) })
				.out();
		});
		const n = 9600; // one full 5 Hz cycle: 200 → 2000 Hz is ~40 semitones
		const hzTap = renderTap(program, nodeIndex(program, "lfo"), "out", 0, n);
		const semisTap = renderTap(program, nodeIndex(program, "hz2semis"), "out", 0, n);
		for (let k = 0; k < n; k += 97) {
			expect(semisTap[k]).toBeCloseTo(hzToSemis(hzTap[k] as number), 3);
		}
		expect(Math.max(...semisTap) - Math.min(...semisTap)).toBeGreaterThan(30);
	});

	it("semis(x) into a Hz port converts: lfo(semis(69)) runs at 440 Hz", () => {
		const a = renderL(() => lfo(semis(69)).gain(0.1).out());
		const b = renderL(() => lfo(440).gain(0.1).out());
		expect(a).toEqual(b);
	});

	it("an untagged value means the port's unit and is never rejected", () => {
		expect(() => runProgram(() => saw(45).lpf({ cutoff: 9000 }).out())).not.toThrow();
	});

	it("a tag with no conversion to the port's unit is a loud error naming both units", () => {
		expect(() =>
			runProgram(() =>
				saw(45)
					.delay({ time: hz(2) })
					.out(),
			),
		).toThrow(/delay\.time: cannot convert hz to secs/);
	});

	it("a tag into a unitless (sig) port is a loud error", () => {
		expect(() => runProgram(() => saw(45).gain(hz(2)).out())).toThrow(
			/gain\.by: cannot convert hz to sig/,
		);
	});

	it("tags declare defmod ports: semis(84) is a semitone port that converts hz()", () => {
		const program = runProgram(() => {
			const probe = defmod({
				name: "probe",
				category: "utils",
				ins: { cutoff: semis(84), other: semis(84) },
				outs: { out: sig() },
				defaultIn: "cutoff",
				defaultOut: "out",
				tick: (_s, i, o) => {
					o.out = i.cutoff + i.other;
				},
			});
			probe({ cutoff: hz(440) })
				.gain(0)
				.out();
		});
		const tap = renderTap(program, nodeIndex(program, "probe"), "out", 0, 1);
		expect(tap[0]).toBe(69 + 84);
	});
});

describe("beats(x) into a seconds port", () => {
	/** The beats2secs converter's output after `n` samples at `bpm`. */
	function beatsAsSecs(bpm: number, x: number, n = 480, beatsPerBar = 4): number {
		const program = runProgram(() => {
			tempo({ bpm, beatsPerBar });
			saw(45)
				.delay({ time: beats(x) })
				.out();
		});
		const tap = renderTap(program, nodeIndex(program, "beats2secs"), "out", 0, n);
		return tap[n - 1] as number;
	}

	it("resolves against the ambient clock: beats(1) at 120 BPM is 0.5 s", () => {
		expect(beatsAsSecs(120, 1)).toBeCloseTo(0.5, 6);
	});

	it("follows the clock's tempo: beats(3/4) at 90 BPM is 0.5 s", () => {
		expect(beatsAsSecs(90, 3 / 4)).toBeCloseTo(0.5, 6);
	});

	it("counts beats, not bars: beats(1) at 120 BPM in 3/4 is still 0.5 s", () => {
		expect(beatsAsSecs(120, 1, 480, 3)).toBeCloseTo(0.5, 6);
	});

	it("with no clock it is a loud error", () => {
		expect(() =>
			runProgram(() =>
				saw(45)
					.delay({ time: beats(1) })
					.out(),
			),
		).toThrow(/beats2secs has no clock/);
	});
});

describe("period(pitch)", () => {
	it("period(69) is 1/440 s", () => {
		const program = runProgram(() => {
			saw(45)
				.delay({ time: period(69) })
				.out();
		});
		const tap = renderTap(program, nodeIndex(program, "period"), "out", 0, 4);
		expect(tap[3]).toBeCloseTo(1 / 440, 9);
	});
});
