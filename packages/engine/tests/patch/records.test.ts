/**
 * Pattern records on seq: one output per field (`s.vel`), read from a table
 * column at the moment `out` updates and held between events, through rests
 * and missing values, like `out`. Both engines agree bit for bit. A re-eval
 * that edits only a field keeps the seq's reader: no new trig.
 *
 * tempo(120): one cycle is 2 s, 96000 samples at 48 kHz; a quarter is 24000.
 */

import "@/library/all";

import { getRegistry } from "@/dsp/define";
import { InterpreterEngine } from "@/runtime/interpreter-engine";
import { withProgramSpecs } from "@/runtime/hydrate-specs";
import { render, renderTap } from "@/runtime/render";
import type { Program } from "@/types";
import { createWasmEngine, swapWasmEngine } from "@/wasm/host/create-wasm-engine";
import { evalPatch } from "@/eval-patch";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "../../testing/bridge-helpers";
import { SR, expectIdentical } from "../../testing/differential-harness";

const f32 = Math.fround;

const patch = (pattern: string, body = "s.tri().mul(s.gate).mul(s.vel).mul(0.3).out()") =>
	evalPatch(`tempo(120)
const s = seq(${pattern})
${body}`);

const FOUR = "p`c3 e3 g3 b3`.with({ vel: p`1 0.4 0.7` })";
const REST = "p`c3 e3`.with({ vel: p`~ 0.5` })";
const HALVES = "p`c3 e3`.with({ vel: p`0.2 0.5` })";
const TWO = "p`c3 e3 g3 b3`.with({ vel: p`1 0.5`, cv2: p`0.1 0.2 0.3 0.4` })";
const TWO_BODY = "s.tri().mul(s.gate).mul(s.vel).add(s.cv2.mul(0.1)).mul(0.3).out()";

const tap = (program: Program, port: string, samples: number) =>
	renderTap(program, nodeIndex(program, "seq"), port, 0, samples);

const at = (xs: Float32Array, samples: readonly number[]) => samples.map((k) => xs[k]);

describe("seq records", () => {
	it("s.vel holds each onset's field value", () => {
		const vel = tap(patch(FOUR), "vel", 96000);
		expect(vel[0]).toBe(1);
		expect(vel[24000]).toBe(1);
		expect(vel[48000]).toBe(f32(0.4));
		expect(vel[72000]).toBe(f32(0.7));
	});

	it("s.vel is a signal", () => {
		const { l } = render(patch(FOUR), 2);
		expect(l.every(Number.isFinite)).toBe(true);
		expect(l.some((x) => Math.abs(x) > 0.01)).toBe(true);
	});

	it("a rest in the field pattern holds the value before it, looking back like out", () => {
		const vel = tap(patch(REST), "vel", 2 * 96000);
		expect(at(vel, [0, 24000, 47000, 48000, 72000, 96000, 120000, 144000])).toEqual(
			Array(8).fill(0.5),
		);
	});

	it("a field that changes per half follows the onsets", () => {
		const vel = tap(patch(HALVES), "vel", 2 * 96000);
		expect(at(vel, [0, 24000, 47000, 97000, 120000])).toEqual(Array(5).fill(f32(0.2)));
		expect(at(vel, [48000, 72000, 95000, 144000, 180000])).toEqual(Array(5).fill(0.5));
	});

	it("two fields: both taps right at the four onsets", () => {
		const program = patch(TWO, TWO_BODY);
		const onsets = [0, 24000, 48000, 72000];
		expect(at(tap(program, "vel", 96000), onsets)).toEqual([1, 1, 0.5, 0.5]);
		expect(at(tap(program, "cv2", 96000), onsets)).toEqual([0.1, 0.2, 0.3, 0.4].map(f32));
	});

	it("a field named after a seq output is a loud error", () => {
		expect(() => patch("p`c3`.with({ gate: p`1` })", "s.tri().out()")).toThrow(/'gate'/);
		expect(() => patch("p`c3`.with({ out: p`1` })", "s.tri().out()")).toThrow(/'out'/);
	});

	it("layers with different field sets are a loud error", () => {
		expect(() => patch("p`c3`.with({ vel: p`1` }).stack(p`e3`)", "s.tri().out()")).toThrow(
			/\[vel\].*\[\]/,
		);
	});
});

/** Lane `lane`'s vel at `samples`. */
const laneVel = (program: Program, lane: number, samples: readonly number[]) =>
	at(renderTap(program, nodeIndex(program, "seq"), "vel", lane, 2 * 96000), samples);

const STABLE = 'p`[c3, e3] ~ [g3, b3] ~`.with({ vel: p`1 ~ 0.5 ~` }).voices("stable")';
const RR = 'p`c3 e3 g3 b3`.with({ vel: p`1 0.5 0.25 0.125` }).voices("rr", 3)';
const OFF = "p`c3 e3`.with({ vel: p`1 0.5` }).off(0.25, (q) => q.add(7))";
const STRUCT = "p`c3 e3 g3 b3`.with({ vel: p`<1 ~> 0.5` }).struct(p`1 0 1 1`)";

describe("seq records through voices and transforms", () => {
	it('voices("stable"): each lane holds its chord tone\'s field through the rests', () => {
		const program = patch(STABLE);
		const samples = [0, 24000, 48000, 72000, 96000, 120000];
		expect(laneVel(program, 0, samples)).toEqual([1, 1, 0.5, 0.5, 1, 1]);
		expect(laneVel(program, 1, samples)).toEqual([1, 1, 0.5, 0.5, 1, 1]);
	});

	it('voices("rr", 3): each lane takes the field of the onset it plays, and holds it', () => {
		const program = patch(RR);
		// Onsets n0..n6 go to lanes 0 1 2 0 1 2 0, every 24000 samples.
		expect(laneVel(program, 0, [0, 72000, 100000, 144000])).toEqual([1, 0.125, 0.125, 0.25]);
		expect(laneVel(program, 1, [24000, 72000, 96000])).toEqual([0.5, 0.5, 1]);
		expect(laneVel(program, 2, [48000, 96000, 120000])).toEqual([0.25, 0.25, 0.5]);
	});

	it(".off: the shifted lane carries its own copy of the field, looked back into cycle 0", () => {
		const program = patch(OFF);
		expect(laneVel(program, 0, [0, 24000, 48000, 72000])).toEqual([1, 1, 0.5, 0.5]);
		expect(laneVel(program, 1, [0, 24000, 48000, 72000])).toEqual([0.5, 1, 1, 0.5]);
	});

	it(".struct: each struck step keeps the field of the event it samples", () => {
		const program = patch(STRUCT);
		expect(laneVel(program, 0, [0, 24000, 48000, 72000, 96000, 144000])).toEqual([
			1, 1, 0.5, 0.5, 0.5, 0.5,
		]);
	});
});

describe("seq records on both engines", () => {
	for (const [label, program] of [
		["four onsets", () => patch(FOUR)],
		["a rest in the field", () => patch(REST)],
		["per half", () => patch(HALVES)],
		["two fields", () => patch(TWO, TWO_BODY)],
		["stable voices", () => patch(STABLE)],
		["rr voices", () => patch(RR)],
		["off", () => patch(OFF)],
		["struct", () => patch(STRUCT)],
		["sometimes", () => patch("p`c3 e3 g3 b3`.with({ vel: p`1` }).sometimes((q) => q.with({ vel: p`0.3` }))")],
	] as const)
		it(`${label}: 8 s bit-identical`, () => {
			expectIdentical(program(), 8 * SR);
		});
});

describe("a re-eval that edits only a field", () => {
	/** Between the onsets at 24000 and 48000, on a block edge. */
	const SWAP = 235 * 128;
	const AFTER = 96000 - SWAP;
	const before = () => patch(FOUR);
	const after = () => patch("p`c3 e3 g3 b3`.with({ vel: p`1 0.4 0.9` })");

	interface Ticks {
		tick(out: Float32Array): void;
		peek(node: number, port: string, lane: number): number;
	}

	/** Tick `engine` for `samples`, peeking the seq's trig and vel after each. */
	function run(engine: Ticks, program: Program, samples: number) {
		const seq = nodeIndex(program, "seq");
		const frame = new Float32Array(2);
		const trig: number[] = [];
		const vel: number[] = [];
		for (let k = 0; k < samples; k++) {
			engine.tick(frame);
			trig.push(engine.peek(seq, "trig", 0));
			vel.push(engine.peek(seq, "vel", 0));
		}
		return { trig, vel };
	}

	const registry = (program: Program) => withProgramSpecs(getRegistry(), program);

	const interpreter = () => {
		const a = before();
		const b = after();
		const head = new InterpreterEngine(a, SR, registry(a));
		for (let k = 0, frame = new Float32Array(2); k < SWAP; k++) head.tick(frame);
		return run(new InterpreterEngine(b, SR, registry(b), head.collectState()), b, AFTER);
	};

	const wasm = () => {
		const head = createWasmEngine(before(), SR, getRegistry());
		for (let k = 0, frame = new Float32Array(2); k < SWAP; k++) head.tick(frame);
		const b = after();
		return run(swapWasmEngine(b, SR, getRegistry(), head), b, AFTER);
	};

	for (const [label, make] of [
		["interpreter", interpreter],
		["wasm", wasm],
	] as const)
		it(`${label}: no trig at the swap; the new values apply from the next onset`, () => {
			const { trig, vel } = make();
			const nextOnset = 48000 - SWAP;
			expect(trig.slice(0, nextOnset - 100).every((x) => x === 0)).toBe(true);
			expect(trig.slice(0, nextOnset + 100).filter((x) => x !== 0)).toHaveLength(1);
			expect(vel[0]).toBe(1);
			expect(vel[48000 - SWAP]).toBe(0.4);
			expect(vel[72000 - SWAP]).toBe(0.9);
		});
});
