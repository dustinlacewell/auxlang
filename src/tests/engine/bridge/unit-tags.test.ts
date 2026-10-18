/**
 * Unit tags (MANIFESTO §2): `hz(x)`, `semis(x)`, `secs(x)`, `beats(x)` say a
 * value is in that unit and the receiving port converts it. Filter cutoff is
 * in semitones; `period(pitch)` gives seconds per cycle.
 */

import "@/engine/library/all";

import { defmod, factory, runProgram, tempo } from "@/engine/api";
import { render, renderTap } from "@/engine/runtime/render";
import { sig } from "@/engine/types";
import { hzToSemis } from "@/engine/units/pitch";
import { beats, hz, semis } from "@/engine/units/tag";
import { describe, expect, it } from "vitest";
import { evalPatch } from "@/engine/eval-patch";
import { nodeIndex } from "./helpers";

const saw = factory("saw");
const lfo = factory("lfo");
const period = factory("period");

const SECONDS = 0.1;

/**
 * The pre-semitone lpf, verbatim (cutoff in Hz), as a shape-C module. Written
 * as patch text (not a TS closure): `hz`/`unit` in a tick's param defaults
 * are read as source text (module/lower/port-markers), and Vitest's SSR
 * import transform would rewrite a real `hz` import into
 * `__vite_ssr_import_N__.hz(...)`, which that text parser doesn't recognize.
 */
const HZLPF = `const hzlpf = defmod("hzlpf", { cat: "filters", args: ["cutoff", "res"] }, ({ sr }) => {
  let ic1 = 0
  let ic2 = 0
  let lastCut = -1
  let lastRes = -1
  let a1 = 0
  let a2 = 0
  let a3 = 0
  return ({ in: x = 0, cutoff = hz(1000), res = unit(0) }) => {
    const c = Math.min(cutoff, 0.49 * sr)
    if (c !== lastCut || res !== lastRes) {
      const g = Math.tan((Math.PI * c) / sr)
      const k = 1 / (0.5 + res * 9.5)
      a1 = 1 / (1 + g * (g + k))
      a2 = g * a1
      a3 = g * (g * a1)
      lastCut = c
      lastRes = res
    }
    const v3 = x - ic2
    const v1 = a1 * ic1 + a2 * v3
    const v2 = ic2 + a2 * ic1 + a3 * v3
    ic1 = 2 * v1 - ic1
    ic2 = 2 * v2 - ic2
    return v2
  }
})
`;

const renderL = (fn: () => void) => render(runProgram(fn), SECONDS).l;

describe("filter cutoff in semitones", () => {
	it("lpf({ cutoff: 69 }) matches the old Hz lpf at cutoff 440", () => {
		const semitone = renderL(() => saw(45).lpf({ cutoff: 69, res: 0.3 }).out());
		const old = render(
			evalPatch(`${HZLPF}\nsaw(45).hzlpf({ cutoff: 440, res: 0.3 }).out()`),
			SECONDS,
		).l;
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
		// `semis` in a tick's param default is read as source text
		// (module/lower/port-markers), so it must stay a free identifier here,
		// not the real `semis` imported above for other tests' TS-level use.
		const program = evalPatch(`const probe = defmod("probe", { args: ["other"] }, () => {
  return ({ cutoff = semis(84), other = semis(84) }) => cutoff + other
})
probe({ cutoff: hz(440) }).gain(0).out()`);
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
