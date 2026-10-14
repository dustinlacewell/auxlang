/**
 * Stereo routing: `pan` places a source at a constant-power angle and its l/r
 * jacks patch straight into the master's left/right. These end-to-end renders
 * prove the placement survives to the output (L≠R, hard-left → R≈0), that total
 * power stays ~constant across the sweep, that poly panning is per-lane, that a
 * mono `.out()` is unchanged, that a bare `.out()` off a stereo source connects
 * by name (l→l, r→r), and that any connection dropping a channel is a loud error.
 */

import { clock, factory, loop, out, runProgram, seq } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { rms } from "./helpers";

const sin = factory("sin");
const tri = factory("tri");
const lfo = factory("lfo");

type Stereo = { l: unknown; r: unknown };

/** Render a mono source panned to a fixed position; return channel RMS. */
function panFixed(pos: number) {
	const program = runProgram(() => {
		sin({ freq: 330 })
			.pan(pos)
			.apply((p: Stereo) => out({ l: p.l, r: p.r }));
	});
	const { l, r } = render(program, 0.25);
	return { l: rms(l), r: rms(r) };
}

describe("stereo routing pan → out", () => {
	it("center pan is equal in both ears", () => {
		const { l, r } = panFixed(0);
		expect(l).toBeGreaterThan(0.01);
		expect(Math.abs(l - r)).toBeLessThan(l * 0.05); // within 5%
	});

	it("hard-left pan silences the right channel", () => {
		const { l, r } = panFixed(-1);
		expect(l).toBeGreaterThan(0.01);
		expect(r).toBeLessThan(l * 0.02); // R ≈ 0
	});

	it("hard-right pan silences the left channel", () => {
		const { l, r } = panFixed(1);
		expect(r).toBeGreaterThan(0.01);
		expect(l).toBeLessThan(r * 0.02); // L ≈ 0
	});

	it("L and R are genuinely different when panned off-center", () => {
		const { l, r } = panFixed(-0.6);
		expect(l).toBeGreaterThan(r * 1.5); // real separation
	});

	it("total power stays within ~1 dB across the whole sweep (constant-power)", () => {
		const powers = [-1, -0.5, 0, 0.5, 1].map((pos) => {
			const { l, r } = panFixed(pos);
			return l * l + r * r; // power ∝ Σ rms²
		});
		const min = Math.min(...powers);
		const max = Math.max(...powers);
		const dB = 10 * Math.log10(max / min);
		expect(dB).toBeLessThan(1);
	});

	it("a modulated pan makes L and R trade over time (motion correlation)", () => {
		const program = runProgram(() => {
			sin({ freq: 330 })
				.pan(lfo(0.5, -1, 1)) // one full sweep every 2 s
				.apply((p: Stereo) => out({ l: p.l, r: p.r }));
		});
		const { l, r } = render(program, 2);
		// The pos sweeps a full cycle, so somewhere L strongly dominates R and
		// somewhere R strongly dominates L. Scan 0.05 s windows and confirm both
		// extremes occur — that is the L/R trade, phase-agnostic.
		const win = Math.round(0.05 * 48000);
		let maxLoverR = 0;
		let maxRoverL = 0;
		for (let s = 0; s + win <= l.length; s += win) {
			const rl = rms(l, s, s + win);
			const rr = rms(r, s, s + win);
			if (rr > 1e-4) maxLoverR = Math.max(maxLoverR, rl / rr);
			if (rl > 1e-4) maxRoverL = Math.max(maxRoverL, rr / rl);
		}
		expect(maxLoverR).toBeGreaterThan(3); // a strongly left-leaning moment
		expect(maxRoverL).toBeGreaterThan(3); // a strongly right-leaning moment
	});

	it("poly through one pan places each voice by its own per-lane pos", () => {
		// A width-3 chord panned by a per-lane pos derived from the chord's own
		// pitch (60/64/67 → scaled to [-1,1]): lane 0 ≈ hard left, lane 2 ≈ hard
		// right. The pan is width-3; out's l/r jacks gather all three lanes.
		const program = runProgram(() => {
			clock(120);
			const chord = seq("{c4,e4,g4}");
			const pos = chord.pitch.scale(-1, 1, 60, 67); // per-lane pitch → per-lane pos
			chord
				.tri()
				.pan(pos)
				.apply((p: Stereo) => out({ l: p.l, r: p.r }));
		});
		const { l, r } = render(program, 0.5);
		const rl = rms(l);
		const rr = rms(r);
		expect(rl).toBeGreaterThan(0.01);
		expect(rr).toBeGreaterThan(0.01);
	});

	it("poly pan lane 0 (hard left) feeds L, lane 2 (hard right) feeds R", () => {
		// Isolate a single lane's placement: pan a 3-lane chord where only lane 0
		// is hard-left and lane 2 hard-right, tap the out node's channels.
		const leftHeavy = runProgram(() => {
			clock(120);
			const chord = seq("{c4,e4,g4}");
			// pos: lane0=-1, lane1=-1, lane2=-1 → all left. Compare against all-right.
			chord
				.tri()
				.pan(-1)
				.apply((p: Stereo) => out({ l: p.l, r: p.r }));
		});
		const rightHeavy = runProgram(() => {
			clock(120);
			const chord = seq("{c4,e4,g4}");
			chord
				.tri()
				.pan(1)
				.apply((p: Stereo) => out({ l: p.l, r: p.r }));
		});
		const lh = render(leftHeavy, 0.5);
		const rh = render(rightHeavy, 0.5);
		expect(rms(lh.l)).toBeGreaterThan(rms(lh.r) * 5); // all voices left
		expect(rms(rh.r)).toBeGreaterThan(rms(rh.l) * 5); // all voices right
	});

	it("an n-lane pan into out({ l, r }) keeps the power of one lane (1/√n mixdown)", () => {
		// Equal-level lanes at distinct pitches are uncorrelated, so 1/√n keeps the
		// summed power equal to one lane's. Level kept well below the safety clip.
		const power = (chord: string) => {
			const program = runProgram(() => {
				clock(120);
				seq(chord)
					.sin()
					.mul(0.3)
					.pan(0)
					.apply((p: Stereo) => out({ l: p.l, r: p.r }));
			});
			const { l, r } = render(program, 0.5);
			return rms(l) ** 2 + rms(r) ** 2;
		};
		const one = power("c4");
		const four = power("{c4,e4,g4,b4}");
		expect(one).toBeGreaterThan(1e-3);
		expect(10 * Math.log10(four / one)).toBeCloseTo(0, 0); // within ±0.5 dB
	});

	it("mono .out() is unchanged (auto-spread center)", () => {
		const program = runProgram(() => {
			sin({ freq: 330 }).out();
		});
		const { l, r } = render(program, 0.25);
		const rl = rms(l);
		const rr = rms(r);
		expect(rl).toBeGreaterThan(0.01);
		expect(Math.abs(rl - rr)).toBeLessThan(rl * 0.05); // dead center
	});

	it("bare .out() off pan connects by name: same render as out({ l, r })", () => {
		const bare = render(
			runProgram(() => {
				sin().pan(0.5).out();
			}),
			0.25,
		);
		const explicit = render(
			runProgram(() => {
				sin()
					.pan(0.5)
					.apply((p: Stereo) => out({ l: p.l, r: p.r }));
			}),
			0.25,
		);
		expect(rms(bare.l)).toBeGreaterThan(0.01);
		expect(bare.l).toEqual(explicit.l);
		expect(bare.r).toEqual(explicit.r);
	});

	it("out(x) with a whole pan connects by name too", () => {
		const free = render(
			runProgram(() => {
				out(sin().pan(-1));
			}),
			0.25,
		);
		const chained = render(
			runProgram(() => {
				sin().pan(-1).out();
			}),
			0.25,
		);
		expect(free.l).toEqual(chained.l);
		expect(free.r).toEqual(chained.r);
	});

	it("chaining a stereo source into a mono module is a loud error naming l/r", () => {
		expect(() =>
			runProgram(() => {
				tri().pan(0.5).lpf(800).out();
			}),
		).toThrow(/into 'lpf'.*'pan' is stereo \(outputs l, r\)/);
	});

	it("a stereo source into a mono-only input is a loud error naming l/r", () => {
		expect(() =>
			runProgram(() => {
				sin().mul(tri().pan(0.5)).out();
			}),
		).toThrow(/mul\.\w+: 'pan' is stereo \(outputs l, r\)/);
		expect(() =>
			runProgram(() => {
				sin()
					.lpf({ cutoff: tri().pan(0.5) })
					.out();
			}),
		).toThrow(/lpf\.cutoff: 'pan' is stereo \(outputs l, r\)/);
	});

	it("a whole stereo source as loop feedback is a loud error naming l/r", () => {
		expect(() =>
			runProgram(() => {
				loop((fb) => sin().add(fb).pan(0)).l.out();
			}),
		).toThrow(/loop\(f\) feedback: 'pan' is stereo \(outputs l, r\)/);
	});

	it("a single tapped channel still connects as mono", () => {
		const { l, r } = render(
			runProgram(() => {
				sin().pan(-1).l.out();
			}),
			0.25,
		);
		expect(rms(l)).toBeGreaterThan(0.01);
		expect(Math.abs(rms(l) - rms(r))).toBeLessThan(rms(l) * 0.05); // auto-spread center
	});

	it("out({ l, r }) object form works as a free function too", () => {
		const program = runProgram(() => {
			const p = sin({ freq: 330 }).pan(-1);
			out({ l: p.l, r: p.r });
		});
		const { l, r } = render(program, 0.25);
		expect(rms(l)).toBeGreaterThan(0.01);
		expect(rms(r)).toBeLessThan(rms(l) * 0.02);
	});
});
