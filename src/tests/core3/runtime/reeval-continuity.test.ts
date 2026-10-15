/**
 * Live re-eval continuity (MANIFESTO §6.2): constants, config and wiring are
 * not identity, so editing a value or rewiring keeps the state of every module
 * still matched by place or kind. The clock position carries across a tempo
 * edit, and patterns pick up mid-cycle; a pattern edit keeps the note under the
 * position.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { factory, p, runProgram, seq, tempo } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import type { EngineState, Program } from "@/core3/types";

const SR = 48000;
/** 2.6 bars at 480 bpm: mid-cycle, inside the third quarter of a 4-step cycle. */
const MID = Math.round(2.6 * (SR / 2));

function run(engine: Core3Engine, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		out.push(frame[0] as number, frame[1] as number);
	}
	return out;
}

const indexOf = (program: Program, module: string): number =>
	program.nodes.findIndex((n) => n.module === module);

/** Run `before` for `samples`, then build an engine for `after` from its state. */
function swap(before: Program, after: Program, samples = MID) {
	const old = new Core3Engine(before, SR, getRegistry());
	run(old, samples);
	const state = old.collectState();
	return { old, state, swapped: new Core3Engine(after, SR, getRegistry(), state) };
}

/** Node i's carried lanes, under the key the engine that ran `state` gave it. */
const lanesAt = (state: EngineState, i: number) =>
	state.nodes[state.identities[i]?.key as string];

/** The lanes of the first `module` node, `program` being the one `state`'s engine ran. */
const lanesOf = (state: EngineState, program: Program, module: string) =>
	lanesAt(state, indexOf(program, module));

const atTempo = (bpm: number) =>
	runProgram(() => {
		tempo(bpm);
		seq("c3 e3 g3 b3").tri().out();
	});

describe("tempo edit keeps the clock position", () => {
	it("tempo(480) → tempo(520) mid-cycle: the position continues", () => {
		const before = atTempo(480);
		const after = atTempo(520);
		const { old, swapped } = swap(before, after);
		const oldPos = old.peek(indexOf(before, "clock"), "out", 0);
		run(swapped, 1);
		const newPos = swapped.peek(indexOf(after, "clock"), "out", 0);
		expect(oldPos).toBeCloseTo(2.6, 3);
		expect(newPos).toBeCloseTo(oldPos + 520 / 60 / 4 / SR, 9);
	});

	it("a seq under that clock keeps reading mid-cycle", () => {
		const after = atTempo(520);
		const { swapped } = swap(atTempo(480), after);
		run(swapped, 1);
		expect(swapped.peek(indexOf(after, "seq"), "out", 0)).toBe(55); // g3, not c3
	});
});

describe("constant edit keeps state downstream", () => {
	const filtered = (cutoff: number) =>
		runProgram(() => {
			factory("saw")(48).lpf(cutoff).delay({ time: 0.1, feedback: 0.5, mix: 0.5 }).out();
		});

	it("lpf(800) → lpf(900) keeps the filter's state and the delay buffer after it", () => {
		const before = filtered(800);
		const after = filtered(900);
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		for (const module of ["saw", "lpf", "delay"]) {
			expect(lanesOf(carried, after, module), module).toEqual(lanesOf(state, before, module));
		}
		const buf = (lanesOf(carried, after, "delay")?.[0] as Record<string, unknown>).buf;
		expect((buf as Float32Array).some((v) => v !== 0)).toBe(true);
	});

	it("editing a lambda keeps the state of the modules it feeds", () => {
		type Cutoff = (s: number, sr: number, t: number) => number;
		const lambda = (cutoff: Cutoff) =>
			runProgram(() => {
				factory("saw")(48).lpf(cutoff).delay({ time: 0.1, feedback: 0.5, mix: 0.5 }).out();
			});
		// Lambdas cross to the engine as source, so they cannot close over a parameter.
		const before = lambda((_s, _sr, t) => 800 + 100 * t);
		const after = lambda((_s, _sr, t) => 900 + 50 * t);
		expect(after.nodes.map((n) => n.place)).toEqual(before.nodes.map((n) => n.place));
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		for (const module of ["lpf", "delay"]) {
			expect(lanesOf(carried, after, module), module).toEqual(lanesOf(state, before, module));
		}
	});
});

describe("config edit keeps state (config is not identity, §6.2)", () => {
	const shaped = (shape: string) =>
		runProgram(() => {
			factory("lfo")({ freq: 3, shape }).mul(factory("sin")(60)).delay({ time: 0.05 }).out();
		});

	it("a changed config keeps that module's state and the state after it", () => {
		const before = shaped("sin");
		const after = shaped("tri");
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		expect(lanesOf(carried, after, "lfo")?.[0]?.phase).not.toBe(0);
		for (const module of ["lfo", "sin", "mul", "delay"]) {
			expect(lanesOf(carried, after, module), module).toEqual(lanesOf(state, before, module));
		}
	});
});

describe("rewiring resets nothing (§6.2)", () => {
	const DELAY = { time: 0.1, feedback: 0.5, mix: 0.5 };

	/** Expect each `after` module to carry the state its `before` namesake ran with. */
	function expectKept(before: Program, after: Program, modules: readonly string[]) {
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		for (const module of modules) {
			expect(lanesOf(state, before, module), module).toBeDefined();
			expect(lanesOf(carried, after, module), module).toEqual(lanesOf(state, before, module));
		}
		return carried;
	}

	it("adding a .mod to an lpf keeps the lpf's state and the delay after it", () => {
		const before = runProgram(() => {
			factory("saw")(48).lpf(800).delay(DELAY).out();
		});
		const after = runProgram(() => {
			factory("saw")(48).lpf(800).mod("cutoff", factory("lfo")(0.3), 12).delay(DELAY).out();
		});
		const carried = expectKept(before, after, ["saw", "lpf", "delay"]);
		const buf = (lanesOf(carried, after, "delay")?.[0] as Record<string, unknown>).buf;
		expect((buf as Float32Array).some((v) => v !== 0)).toBe(true);
	});

	it("inserting a module keeps the state below it and the oscillator above it", () => {
		const before = runProgram(() => {
			factory("saw")(48).lpf(800).delay(DELAY).out();
		});
		const after = runProgram(() => {
			factory("saw")(48).lpf(800).hpf(100).delay(DELAY).out();
		});
		const carried = expectKept(before, after, ["saw", "lpf", "delay"]);
		expect(lanesOf(carried, after, "saw")?.[0]?.phase).not.toBe(0);
	});

	/** Programs running `first` then `second`, and the same chains in swapped code order. */
	function swappedChains(first: () => void, second: () => void) {
		const before = runProgram(() => {
			first();
			second();
		});
		const after = runProgram(() => {
			second();
			first();
		});
		return { before, after };
	}

	/** The `module` nodes of a program, in program order, by index. */
	const nodesOf = (program: Program, module: string) =>
		program.nodes.flatMap((n, i) => (n.module === module ? [{ node: n, i }] : []));

	/**
	 * Each `module` node in `after` carries the state of the `before` node of
	 * its own chain (same place and upstream), and the chains' states differ.
	 */
	function expectOwnChainState(before: Program, after: Program, module: string) {
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		const chainOf = (n: Program["nodes"][number]) => `${n.place}|${n.upstream}`;
		const olds = nodesOf(before, module);
		const news = nodesOf(after, module);
		expect(news.map((n) => chainOf(n.node)), module).not.toEqual(olds.map((o) => chainOf(o.node)));
		expect(lanesAt(state, olds[0]?.i as number), module).not.toEqual(
			lanesAt(state, olds[1]?.i as number),
		);
		for (const { node, i } of news) {
			const old = olds.find((o) => chainOf(o.node) === chainOf(node));
			expect(lanesAt(state, old?.i as number), module).toBeDefined();
			expect(lanesAt(carried, i), module).toEqual(lanesAt(state, old?.i as number));
		}
	}

	it("swapping two parallel chains keeps each chain's state", () => {
		const { before, after } = swappedChains(
			() => factory("saw")(48).lpf(800).delay(DELAY).out(),
			() => factory("sin")(60).lpf(1200).out(),
		);
		for (const module of ["lpf", "out"]) expectOwnChainState(before, after, module);
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		for (const module of ["saw", "sin", "delay"]) {
			expect(lanesOf(state, before, module), module).toBeDefined();
			expect(lanesOf(carried, after, module), module).toEqual(lanesOf(state, before, module));
		}
	});

	it("swapping saw→lpf→out and sin→lpf→out keeps each lpf and out with its chain", () => {
		const { before, after } = swappedChains(
			() => factory("saw")(48).lpf(800).out(),
			() => factory("sin")(60).lpf(1200).out(),
		);
		expect(nodesOf(after, "lpf").map((n) => n.node.place)).toEqual(
			nodesOf(before, "lpf").map((n) => n.node.place),
		); // one shared place: only the upstream signature tells them apart
		for (const module of ["lpf", "out"]) expectOwnChainState(before, after, module);
	});

	it("deleting the first of two near-identical chains leaves the survivor its own state", () => {
		const chain = (pitch: number) => () => factory("saw")(pitch).lpf(60).delay(DELAY).out();
		const before = runProgram(() => {
			chain(48)();
			chain(55)();
		});
		const after = runProgram(chain(55));
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		for (const module of ["saw", "lpf", "delay", "out"]) {
			const [deleted, survivor] = nodesOf(before, module);
			const [kept] = nodesOf(after, module);
			expect(lanesAt(state, deleted?.i as number), module).not.toEqual(
				lanesAt(state, survivor?.i as number),
			);
			expect(lanesAt(carried, kept?.i as number), module).toEqual(
				lanesAt(state, survivor?.i as number),
			);
		}
	});

	it("two chains identical in every constant pair by code order", () => {
		const chain = () => factory("noise")().lpf(800).delay(DELAY).out();
		const both = () =>
			runProgram(() => {
				chain();
				chain();
			});
		const before = both();
		const after = both();
		const { state, swapped } = swap(before, after);
		const carried = swapped.collectState();
		for (const module of ["noise", "lpf", "delay", "out"]) {
			const olds = nodesOf(before, module);
			expect(lanesAt(state, olds[0]?.i as number), module).not.toEqual(
				lanesAt(state, olds[1]?.i as number),
			);
			nodesOf(after, module).forEach(({ i }, k) => {
				expect(lanesAt(carried, i), module).toEqual(lanesAt(state, olds[k]?.i as number));
			});
		}
	});

	it("noise keeps its stream across a rewire", () => {
		const before = runProgram(() => {
			factory("noise")().lpf(2000).out();
		});
		const after = runProgram(() => {
			factory("noise")().hpf(100).lpf(2000).out();
		});
		const tap = (engine: Core3Engine, program: Program) => {
			const frame = new Float32Array(2);
			return Array.from({ length: 1000 }, () => {
				engine.tick(frame);
				return engine.peek(indexOf(program, "noise"), "out", 0);
			});
		};
		const reference = new Core3Engine(before, SR, getRegistry());
		run(reference, MID);
		const { swapped } = swap(before, after);
		expect(tap(swapped, after)).toEqual(tap(reference, before));
	});
});

describe("sample-rate change", () => {
	it("48 kHz → 44.1 kHz migrates nothing: the delay buffer is sized for 44.1 kHz", () => {
		const program = runProgram(() => {
			factory("saw")(48).delay({ time: 0.1 }).out();
		});
		const old = new Core3Engine(program, 48000, getRegistry());
		run(old, 1000);
		const swapped = new Core3Engine(program, 44100, getRegistry(), old.collectState());
		const lanes = lanesOf(swapped.collectState(), program, "delay");
		const buf = (lanes?.[0] as Record<string, unknown>).buf as Float32Array;
		expect(buf.length).toBe(4 * 44100);
		expect(buf.every((v) => v === 0)).toBe(true);
	});
});

describe("re-eval of an unchanged patch", () => {
	const patch = () =>
		runProgram(() => {
			tempo(480);
			const s = seq("c3 ~ e3 g3");
			s.tri().mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2)).out();
			factory("sin")(p`60 67 ~ 72`).mul(0.01).out();
		});

	it("is bit-exact against an engine that never swapped (seq → adsr, pattern knob)", () => {
		const reference = new Core3Engine(patch(), SR, getRegistry());
		run(reference, MID);
		const expected = run(reference, SR / 2);
		const { swapped } = swap(patch(), patch());
		expect(run(swapped, SR / 2)).toEqual(expected);
	});
});

describe("pattern edit", () => {
	const melody = (pattern: string) =>
		runProgram(() => {
			tempo(480);
			seq(pattern).tri().out();
		});

	it("takes effect at once, at the current position in the cycle", () => {
		const after = melody("d3 f3 a3 c4");
		const { swapped } = swap(melody("c3 e3 g3 b3"), after);
		run(swapped, 1);
		expect(swapped.peek(indexOf(after, "seq"), "out", 0)).toBe(57); // a3
	});

	// MID is 2.6 bars: inside g3's step [2.5, 2.75). 3000 samples stay inside it.
	const REST_OF_NOTE = 3000;

	it("leaving the note under the position unchanged gives no trig and no gate dip", () => {
		const after = melody("c3 e3 g3 c4"); // only the last note changes
		const { swapped } = swap(melody("c3 e3 g3 b3"), after);
		const { trig, gate } = seqTaps(swapped, indexOf(after, "seq"), REST_OF_NOTE);
		expect(trig.every((v) => v === 0)).toBe(true);
		expect(gate.every((v) => v === 1)).toBe(true);
	});

	it("putting a different note under the position fires one trig", () => {
		const after = melody("c3 e3 g3"); // 2.6 now sits in the e3 of [2⅓, 2⅔)
		const { swapped } = swap(melody("c3 e3 g3 b3"), after);
		const { trig } = seqTaps(swapped, indexOf(after, "seq"), 1200); // ends before 2⅔
		expect(trig.filter((v) => v === 1).length).toBe(1);
		expect(trig[0]).toBe(1);
	});
});

function seqTaps(engine: Core3Engine, node: number, samples: number) {
	const frame = new Float32Array(2);
	const trig: number[] = [];
	const gate: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		trig.push(engine.peek(node, "trig", 0));
		gate.push(engine.peek(node, "gate", 0));
	}
	return { trig, gate };
}
