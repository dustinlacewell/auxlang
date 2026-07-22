/**
 * The platonic.md §10 closing patch, adapted to the shipped module set
 * (no spread / per-lane fine detune; hihat velocity applied by vca instead of
 * a value-driven drum input). Everything at once: ambient clock, pattern
 * algebra, notation, pattern-as-signal modulation, packed poly lanes,
 * trigger-domain stepping, tempo-free feedback delay, seeded degrade.
 * Renders 4 s: non-silent throughout, bounded, finite, deterministic.
 */

import { type Handle, clock, factory, loop, p, patstep, runProgram, seq } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { SR, allFinite, maxAbs, rms } from "./helpers";

const lfo = factory("lfo");

function build() {
	return runProgram(() => {
		clock(126);

		// --- pads: width-3 stack, packed lanes, pattern-modulated cutoff
		const padP = p`{c3,e3,g3} <{a2,c3,e3} {f2,a2,c3}>`.slow(2);
		const pad = seq(padP);
		pad.pitch
			.saw()
			.lpf({ cutoff: p`400 <800 1600>`.slow(2), res: 0.2 })
			.mul(pad.gate.adsr(0.4, 0.3, 0.7, 1.2))
			.out();

		// --- acid line: transformed hook, feedback delay
		const hook = p`c2 [c2 eb2] g1 <bb1 c2>`;
		const line = seq(hook.every(4, (q) => q.rev()).off(1 / 8, (q) => q.add(12).degrade(0.4)));
		loop((fb) =>
			line.pitch
				.slew(0.03)
				.saw()
				.lpf({ cutoff: line.gate.adsr(0.001, 0.12, 0, 0).mul(3000).add(180), res: 0.85 })
				.mul(line.gate)
				.add(fb.delay({ time: 0.35, mix: 1 }).mul(0.35)),
		).out();

		// --- drums: euclidean kick, backbeat snare, hat stepped by a comparator
		seq(p`60(4,4)`).trig.kick().out();
		seq(p`~ 60 ~ 60`).trig.snare().out();
		lfo(9)
			.gt(0.7)
			.apply((tg: Handle) => tg.hihat().mul(patstep(p`1 0.6 0.8 0.5`, tg)).mul(0.8).out());
	});
}

describe("closing patch (platonic.md §10, adapted)", () => {
	const program = build();
	const first = render(program, 4);

	it("renders 4 s non-silent in every second, bounded and finite", () => {
		expect(allFinite(first.l)).toBe(true);
		expect(allFinite(first.r)).toBe(true);
		for (let s = 0; s < 4; s++) {
			expect(rms(first.l, s * SR, (s + 1) * SR)).toBeGreaterThan(1e-4);
		}
		expect(maxAbs(first.l)).toBeLessThan(4.1); // four soft-clipped outs summed
		expect(maxAbs(first.r)).toBeLessThan(4.1);
	});

	it("is deterministic: a second render is bit-identical", () => {
		const second = render(program, 4);
		expect(second.l).toEqual(first.l);
		expect(second.r).toEqual(first.r);
	});

	it("recompiling the same source yields the same program (structural ids stable)", () => {
		const again = build();
		expect(JSON.stringify(again)).toBe(JSON.stringify(program));
	});
});
