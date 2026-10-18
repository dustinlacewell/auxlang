/**
 * beats(x) on time inputs (MANIFESTO §5.5, §11): a value that retunes with
 * the governing clock, end to end through real time-taking modules (delay,
 * adsr) rather than the converter node alone.
 */

import "@/engine/modules/all";

import { factory, runProgram, tempo } from "@/engine/api";
import { render, renderTap } from "@/engine/runtime/render";
import { beats } from "@/engine/units/tag";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

const saw = factory("saw");
const lfo = factory("lfo");

const SECONDS = 0.2;
const renderL = (fn: () => void) => render(runProgram(fn), SECONDS).l;

describe("beats(x) on time inputs — end to end", () => {
	it("delay({ time: beats(1) }) at 120 BPM renders the same as delay({ time: 0.5 })", () => {
		const tagged = renderL(() => {
			tempo(120);
			saw(45).delay({ time: beats(1) }).out();
		});
		const plain = renderL(() => saw(45).delay({ time: 0.5 }).out());
		expect(tagged).toEqual(plain);
	});

	it("a tempo change moves the delay time: a slow LFO sweeping bpm changes beats(1)'s echo position", () => {
		const sr = 48000;
		const dur = 1.0; // long enough for beats(1)'s echo to arrive at every swept tempo
		const n = Math.round(dur * sr);
		const renderAt = (fn: () => void) => render(runProgram(fn), dur).l;

		const swept = renderAt(() => {
			tempo(lfo(0.1, 90, 150)); // sweeps slowly; near-constant within one echo window
			saw(45).delay({ time: beats(1), feedback: 0, mix: 1 }).out();
		});
		const fast = renderAt(() => {
			tempo(150);
			saw(45).delay({ time: beats(1), feedback: 0, mix: 1 }).out();
		});
		const slow = renderAt(() => {
			tempo(90);
			saw(45).delay({ time: beats(1), feedback: 0, mix: 1 }).out();
		});

		// The swept run must differ from both fixed-tempo extremes: the echo
		// isn't sitting at either tempo's fixed delay position.
		expect(swept.slice(0, n)).not.toEqual(fast.slice(0, n));
		expect(swept.slice(0, n)).not.toEqual(slow.slice(0, n));

		// Sanity: the two fixed tempos do land at different sample offsets.
		const delaySamples = (bpm: number) => Math.round((60 / bpm) * sr);
		expect(delaySamples(150)).not.toBe(delaySamples(90));
	});

	it("adsr(beats(0.25), ...) attack is a quarter beat: 0.125 s at 120 BPM", () => {
		const sr = 48000;
		const attackSamples = Math.round(0.125 * sr);

		const program = runProgram(() => {
			tempo(120);
			saw(45)
				.mul(lfo(0).gt(-1).adsr(beats(0.25), 0.2, 0.7, 0.2))
				.out();
		});
		// Tap the adsr node's own level directly: the first sample it reaches 1
		// (end of attack) measures the attack time exactly, with no confound
		// from the carrier waveform's own shape.
		const tap = renderTap(program, nodeIndex(program, "adsr"), "out", 0, sr);
		const peakSample = tap.findIndex((v) => v >= 1);
		expect(peakSample).toBeGreaterThan(0);
		expect(peakSample).toBeCloseTo(attackSamples, -1); // within ~10 samples
	});
});
