/**
 * Mux and signal splicing (mux-signals-in-patterns card): `mux` switches
 * between live cables by index; splicing a signal into a pattern desugars
 * to `mux(seq(indexPattern), palette)` (patch/build-palette-mux,
 * pattern/palette). The lfo keeps running whether or not it is selected,
 * `.fast`/`.add` affect the switch/palette as designed, and re-eval keeps
 * palette members' state across a step added to the pattern.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { factory, p, runProgram, seq, tempo } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { InterpreterEngine } from "@/engine/runtime/interpreter-engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { renderTap } from "@/engine/runtime/render";
import { nodeIndex } from "../bridge/helpers";

const SR = 48000;
const CYCLE = 96000; // tempo(120): one bar = 2s at 48kHz
const HALF = CYCLE / 2;
/** seq's clock integrates before emitting, so a step can land a sample early (seq-basics.test.ts). */
const EDGE = 2;

describe("mux module alone", () => {
	it("picks palette[index]; truncates; out of range is 0", () => {
		const program = runProgram(() => {
			factory("mux")(1, [3, 5, 7]).out();
		});
		expect(renderTap(program, nodeIndex(program, "mux"), "out", 0, 1)[0]).toBeCloseTo(5, 6);
	});

	it("index 2.9 truncates to 2", () => {
		const program = runProgram(() => {
			factory("mux")(2.9, [3, 5, 7]).out();
		});
		expect(renderTap(program, nodeIndex(program, "mux"), "out", 0, 1)[0]).toBeCloseTo(7, 6);
	});

	it("index 3 (== length) is out of range: 0", () => {
		const program = runProgram(() => {
			factory("mux")(3, [3, 5, 7]).out();
		});
		expect(renderTap(program, nodeIndex(program, "mux"), "out", 0, 1)[0]).toBeCloseTo(0, 6);
	});

	it("index -1 is out of range: 0", () => {
		const program = runProgram(() => {
			factory("mux")(-1, [3, 5, 7]).out();
		});
		expect(renderTap(program, nodeIndex(program, "mux"), "out", 0, 1)[0]).toBeCloseTo(0, 6);
	});
});

const lfoOf = (program: ReturnType<typeof runProgram>) => program.nodes.findIndex((n) => n.module === "lfo");

describe("splicing a signal into a pattern", () => {
	function build() {
		return runProgram(() => {
			tempo(120);
			const osc = factory("lfo")(0.3, 60, 96);
			factory("lpf")({ cutoff: p`${osc} 80` }).out();
		});
	}

	it("selects the lfo in the first half cycle, 80 in the second", () => {
		const program = build();
		const lfoTap = renderTap(program, lfoOf(program), "out", 0, CYCLE);
		const muxTap = renderTap(program, nodeIndex(program, "mux"), "out", 0, CYCLE);
		for (let n = 0; n < HALF - EDGE; n++) expect(muxTap[n]).toBeCloseTo(lfoTap[n] as number, 6);
		for (let n = HALF + EDGE; n < CYCLE - EDGE; n++) expect(muxTap[n]).toBeCloseTo(80, 6);
	});

	it("the lfo keeps running in the second cycle (no phase reset)", () => {
		const program = build();
		const lfoTap = renderTap(program, lfoOf(program), "out", 0, 2 * CYCLE);
		const muxTap = renderTap(program, nodeIndex(program, "mux"), "out", 0, 2 * CYCLE);
		for (let n = CYCLE; n < CYCLE + HALF; n++) {
			expect(muxTap[n]).toBeCloseTo(lfoTap[n] as number, 6);
		}
	});
});

describe(".fast(2) on a spliced pattern", () => {
	it("switches twice as often; the lfo rate is unchanged", () => {
		const base = runProgram(() => {
			tempo(120);
			factory("lfo")(0.3, 60, 96).out();
		});
		const baseLfo = renderTap(base, nodeIndex(base, "lfo"), "out", 0, CYCLE);

		const program = runProgram(() => {
			tempo(120);
			const osc = factory("lfo")(0.3, 60, 96);
			factory("lpf")({ cutoff: p`${osc} 80`.fast(2) }).out();
		});
		const muxTap = renderTap(program, nodeIndex(program, "mux"), "out", 0, CYCLE);
		const Q = CYCLE / 4;
		for (let n = 0; n < Q - EDGE; n++) expect(muxTap[n]).toBeCloseTo(baseLfo[n] as number, 5);
		for (let n = Q + EDGE; n < 2 * Q - EDGE; n++) expect(muxTap[n]).toBeCloseTo(80, 6);
		for (let n = 2 * Q + EDGE; n < 3 * Q - EDGE; n++) {
			expect(muxTap[n]).toBeCloseTo(baseLfo[n] as number, 5);
		}
		for (let n = 3 * Q + EDGE; n < 4 * Q - EDGE; n++) expect(muxTap[n]).toBeCloseTo(80, 6);
	});
});

describe(".add(12) on a spliced pattern", () => {
	it("adds to the lfo's own output (a new node) and to the literal member", () => {
		const base = runProgram(() => {
			tempo(120);
			factory("lfo")(0.3, 60, 96).out();
		});
		const baseLfo = renderTap(base, nodeIndex(base, "lfo"), "out", 0, CYCLE);

		const program = runProgram(() => {
			tempo(120);
			const osc = factory("lfo")(0.3, 60, 96);
			factory("lpf")({ cutoff: p`${osc} 80`.add(12) }).out();
		});
		const muxTap = renderTap(program, nodeIndex(program, "mux"), "out", 0, CYCLE);
		for (let n = 0; n < HALF - EDGE; n++) expect(muxTap[n]).toBeCloseTo((baseLfo[n] as number) + 12, 5);
		for (let n = HALF + EDGE; n < CYCLE - EDGE; n++) expect(muxTap[n]).toBeCloseTo(92, 6);
	});
});

describe("re-eval adding a step keeps the lfo's phase", () => {
	it("the lfo's phase under the swap matches an un-swapped lfo tap at the same sample", () => {
		const before = runProgram(() => {
			tempo(120);
			const osc = factory("lfo")(0.3, 60, 96);
			factory("lpf")({ cutoff: p`${osc} 80` }).out();
		});
		const after = runProgram(() => {
			tempo(120);
			const osc = factory("lfo")(0.3, 60, 96);
			factory("lpf")({ cutoff: p`${osc} 80 70` }).out();
		});
		const reference = runProgram(() => {
			tempo(120);
			factory("lfo")(0.3, 60, 96).out();
		});

		const registry = getRegistry();
		const oldEngine = new InterpreterEngine(before, SR, withProgramSpecs(registry, before));
		const frame = new Float32Array(2);
		const RUN = Math.floor(HALF * 1.5);
		for (let i = 0; i < RUN; i++) oldEngine.tick(frame);
		const state = oldEngine.collectState();

		const newEngine = new InterpreterEngine(after, SR, withProgramSpecs(registry, after), state);
		for (let i = 0; i < 5; i++) newEngine.tick(frame);

		const refEngine = new InterpreterEngine(reference, SR, withProgramSpecs(registry, reference));
		for (let i = 0; i < RUN + 5; i++) refEngine.tick(frame);

		expect(newEngine.peek(lfoOf(after), "out", 0)).toBeCloseTo(
			refEngine.peek(nodeIndex(reference, "lfo"), "out", 0),
			5,
		);
	});
});

describe("stack of a palette pattern and a plain one", () => {
	it("the plain side's member lands after the palette side's, offset correctly", () => {
		const program = runProgram(() => {
			tempo(120);
			const osc = factory("lfo")(0.3, 60, 96);
			const palette = p`${osc} 80`;
			const plain = p`1 2`;
			factory("lpf")({ cutoff: palette.stack(plain) }).out();
		});
		const muxNode = program.nodes[nodeIndex(program, "mux")] as { groups?: Record<string, readonly string[]> };
		expect(muxNode.groups?.palette).toHaveLength(4); // osc, 80, 1, 2
	});
});

describe("seq() of a palette pattern is a loud error", () => {
	it("names the pattern-as-input-value workaround", () => {
		expect(() =>
			runProgram(() => {
				tempo(120);
				const osc = factory("lfo")(0.3, 60, 96);
				seq(p`${osc} 80`).out();
			}),
		).toThrow(/pattern with signals inside works as an input value/);
	});
});

describe(".with() and palette patterns are a loud error", () => {
	it("refuses a palette pattern on either side", () => {
		const osc = () => factory("lfo")(0.3, 60, 96);
		expect(() => runProgram(() => p`${osc()} 80`.with({ vel: p`1` }))).toThrow(
			/records of signal patterns/,
		);
		expect(() => runProgram(() => p`60 67`.with({ vel: p`${osc()} 1` }))).toThrow(
			/records of signal patterns/,
		);
	});
});
