import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { getModule, getRegistry } from "@/engine/dsp/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { Program } from "@/engine/types";
import { evalPatch } from "@/engine/eval-patch";
import { type Ins, SR, driver, maxAbs, rms } from "./helpers";

const tape = getModule("tape");
const delay = getModule("delay");

/** A 220 Hz sine burst for `on` samples, then silence, `n` samples long. */
function burst(n: number, on: number, amp = 0.5): number[] {
	return Array.from({ length: n }, (_, k) =>
		k < on ? amp * Math.sin((2 * Math.PI * 220 * k) / SR) : 0,
	);
}

/** Run `input` through a fresh driver of `spec`, one sample per tick. */
function render(spec: typeof tape, input: number[], over: Ins): number[] {
	const d = driver(spec);
	return input.map((x) => d.step({ ...over, in: x }).out!);
}

describe("tape", () => {
	it("defaults are a mild echo: dry note, then a quieter repeat at 0.3 s", () => {
		expect(tape.ins.time?.def).toBe(0.3);
		const out = render(tape, burst(SR, 2400), {});
		const dry = rms(out.slice(0, 2400));
		const echo = rms(out.slice(Math.round(0.3 * SR), Math.round(0.3 * SR) + 2400));
		const between = rms(out.slice(4000, Math.round(0.3 * SR) - 1000));
		expect(dry).toBeGreaterThan(0.2);
		expect(echo).toBeGreaterThan(dry * 0.1);
		expect(echo).toBeLessThan(dry * 0.6);
		expect(between).toBeLessThan(echo * 0.05);
	});

	it("all params set: finite, bounded, echo at the set time", () => {
		const over = {
			time: 0.2,
			feedback: 0.6,
			mix: 0.5,
			drive: 0.5,
			wow: 0.5,
			flutter: 0.5,
			tone: 0.4,
		};
		const out = render(tape, burst(SR, 2400), over);
		expect(out.every(Number.isFinite)).toBe(true);
		const echo = rms(out.slice(Math.round(0.2 * SR), Math.round(0.2 * SR) + 2400));
		expect(echo).toBeGreaterThan(0.02);
		expect(maxAbs(out)).toBeLessThan(1);
	});

	it("stays finite and bounded at feedback 1 and drive 1 over 10 s", () => {
		const n = 10 * SR;
		const d = driver(tape);
		const over = { time: 0.05, feedback: 1, drive: 1, mix: 1, wow: 1, flutter: 1, tone: 1 };
		let peak = 0;
		let finite = true;
		for (let k = 0; k < n; k++) {
			const x = k < SR ? Math.sin((2 * Math.PI * 110 * k) / SR) : 0;
			const y = d.step({ ...over, in: x }).out!;
			finite = finite && Number.isFinite(y);
			peak = Math.max(peak, Math.abs(y));
		}
		expect(finite).toBe(true);
		// The saturator caps what is recorded at 1/k = 1/3; the playback EQ adds at most a few dB.
		expect(peak).toBeLessThan(1);
	});

	/**
	 * Tolerance: the playback EQ (head bump, HF loss) stays in, so the match is
	 * per echo, not per sample — each echo peaks within 1 sample of delay's,
	 * and a 440 Hz echo's RMS is within 5% of delay's for the first three.
	 */
	describe("with wow, flutter and drive at 0 and tone 1 it is a clean delay", () => {
		const knobs = { time: 0.1, feedback: 0.5, mix: 1, tone: 1 };
		const clean = { ...knobs, wow: 0, flutter: 0, drive: 0 };
		const echoAt = (n: number) => Math.round(n * 0.1 * SR);

		it("echoes land where delay's do (±1 sample)", () => {
			const input = Array.from({ length: echoAt(4) }, (_, k) => (k === 0 ? 0.5 : 0));
			const peakNear = (xs: number[], at: number) => {
				let best = at - 50;
				for (let k = at - 50; k < at + 50; k++)
					if (Math.abs(xs[k]!) > Math.abs(xs[best]!)) best = k;
				return best;
			};
			const ours = render(tape, input, clean);
			const ref = render(delay, input, knobs);
			for (const n of [1, 2, 3]) {
				expect(Math.abs(peakNear(ours, echoAt(n)) - peakNear(ref, echoAt(n)))).toBeLessThanOrEqual(
					1,
				);
			}
		});

		it("each echo's level is within 5% of delay's", () => {
			const input = Array.from({ length: echoAt(4) }, (_, k) =>
				k < 2400 ? 0.3 * Math.sin((2 * Math.PI * 440 * k) / SR) : 0,
			);
			const ours = render(tape, input, clean);
			const ref = render(delay, input, knobs);
			for (const n of [1, 2, 3]) {
				const window = (xs: number[]) => rms(xs.slice(echoAt(n) + 200, echoAt(n) + 2200));
				expect(Math.abs(window(ours) / window(ref) - 1)).toBeLessThan(0.05);
			}
		});
	});

	it("drive saturates loud input and leaves quiet input almost clean", () => {
		const gainAt = (amp: number, drive: number) => {
			const out = render(tape, burst(9600, 4800, amp), {
				time: 0.05,
				feedback: 0,
				mix: 1,
				wow: 0,
				flutter: 0,
				tone: 1,
				drive,
			});
			return rms(out.slice(2400 + 1200, 2400 + 3600)) / (amp / Math.SQRT2);
		};
		expect(Math.abs(gainAt(0.05, 1) / gainAt(0.05, 0) - 1)).toBeLessThan(0.01);
		expect(gainAt(0.9, 1)).toBeLessThan(gainAt(0.9, 0) * 0.6);
	});

	it("tone below 1 darkens the repeats", () => {
		const input = Array.from({ length: SR }, (_, k) => (k === 0 ? 1 : 0));
		const knobs = { time: 0.05, feedback: 0.8, mix: 1, wow: 0, flutter: 0, drive: 0 };
		const hf = (tone: number) => {
			const out = render(tape, input, { ...knobs, tone });
			const third = out.slice(Math.round(0.15 * SR) - 200, Math.round(0.15 * SR) + 400);
			return rms(third.map((y, k) => (k === 0 ? 0 : y - third[k - 1]!)));
		};
		expect(hf(0.2)).toBeLessThan(hf(1) * 0.5);
	});

	it("wow and flutter bend the playhead: the output moves away from a still tape", () => {
		const input = Array.from(
			{ length: SR },
			(_, k) => 0.3 * Math.sin((2 * Math.PI * 440 * k) / SR),
		);
		const still = render(tape, input, { mix: 1, feedback: 0, wow: 0, flutter: 0 });
		const moved = (over: Ins) => {
			const out = render(tape, input, { mix: 1, feedback: 0, wow: 0, flutter: 0, ...over });
			return rms(out.map((y, k) => y - still[k]!)) / rms(still);
		};
		expect(moved({ wow: 1 })).toBeGreaterThan(0.3);
		expect(moved({ flutter: 1 })).toBeGreaterThan(0.05);
		expect(moved({ wow: 1 })).toBeGreaterThan(moved({ wow: 0.2 }));
	});
});

/** Two tapes with only flutter on, fed the same sine. */
function twoTapes(seed: number): Program {
	return evalPatch(
		`const s = sin(57).gain(0.3)
s.tape({ mix: 1, feedback: 0, wow: 0, flutter: 1 }).out()
s.tape({ mix: 1, feedback: 0, wow: 0, flutter: 1 }).out()`,
		{ seed },
	);
}

/** Each tape node's output for one second. */
function tapeTaps(program: Program): number[][] {
	const e = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
	const sites = program.nodes.flatMap((n, i) => (n.module === "tape" ? [i] : []));
	const series = sites.map(() => [] as number[]);
	const frame = new Float32Array(2);
	for (let k = 0; k < SR; k++) {
		e.tick(frame);
		sites.forEach((node, j) => series[j]?.push(e.peek(node, "out", 0)));
	}
	return series;
}

describe("tape flutter randomness", () => {
	it("differs between two instances", () => {
		const [a, b] = tapeTaps(twoTapes(1));
		expect(a).toHaveLength(SR);
		expect(rms(a!.map((y, k) => y - b![k]!))).toBeGreaterThan(1e-4);
	});

	it("reproduces with the same seed and changes with another", () => {
		expect(tapeTaps(twoTapes(42))).toEqual(tapeTaps(twoTapes(42)));
		expect(tapeTaps(twoTapes(42))).not.toEqual(tapeTaps(twoTapes(43)));
	});
});
