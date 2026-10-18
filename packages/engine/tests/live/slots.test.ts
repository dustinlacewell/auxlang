/**
 * Live slots (runtime/live/live-contract.ts): a control module or a dragged
 * number literal reads a slot the editor writes while the patch plays. A
 * write changes the output with no re-eval and no rebuild, on both engines
 * bit for bit; every control clamps and slews; a re-eval keeps a slot whose
 * site is unchanged.
 */

import { describe, expect, it } from "vitest";

import "@/library/all";
import { getRegistry } from "@/dsp/define";
import { InterpreterEngine } from "@/runtime/interpreter-engine";
import { withProgramSpecs } from "@/runtime/hydrate-specs";
import type { Program } from "@/types";
import { createWasmEngine, swapWasmEngine } from "@/wasm/host/create-wasm-engine";
import { evaluatePatch } from "@/eval-patch";
import { firstBitDiff } from "../../testing/differential-harness";
import { BLOCK, Session, slice } from "../runtime/live-session";
import { ENGINES, SR, type SlotEngine, nodeOf, renderWithWrites } from "./slot-render";

const MS20 = Math.round(0.02 * SR);

const program = (code: string, slotSites?: ReadonlySet<number>): Program =>
	evaluatePatch(code, slotSites === undefined ? {} : { slotSites }).program;

const SLIDER = "sin(60).gain(slider(0.5, 0, 1)).out()";

describe.each(Object.entries(ENGINES))("slots on the %s engine", (_name, make) => {
	it("a slider write reaches the output after the slew, with no re-eval", () => {
		const p = program(SLIDER);
		expect(p.liveSlots).toEqual([expect.objectContaining({ init: 0.5, min: 0, max: 1 })]);
		const engine = make(p);
		const slider = nodeOf(p, "slider");
		const run = renderWithWrites(engine, 200 + MS20 + 10, [{ at: 200, slot: 0, value: 0.8 }], [
			{ node: slider, port: "out" },
		]);
		const out = run.taps[0] as Float64Array;
		expect(out[199]).toBeCloseTo(0.5, 12);
		expect(Math.abs((out[200 + MS20] as number) - 0.8)).toBeLessThanOrEqual(1e-9);
		expect(engine.slotValue(0)).toBe(0.8);
	});

	it("a step write ramps: no step larger than the slew's rate", () => {
		const p = program("sin(60).gain(slider(0, 0, 1)).out()");
		const slider = nodeOf(p, "slider");
		const run = renderWithWrites(make(p), 2000, [{ at: 500, slot: 0, value: 0.3 }], [
			{ node: slider, port: "out" },
		]);
		const out = run.taps[0] as Float64Array;
		const limit = (0.3 / (0.01 * SR)) * 1.01;
		for (let k = 1; k < out.length; k++)
			expect(Math.abs((out[k] as number) - (out[k - 1] as number))).toBeLessThanOrEqual(limit);
		expect(out[1999]).toBe(0.3);
	});

	it("clamps a write to the control's range", () => {
		const p = program(SLIDER);
		const slider = nodeOf(p, "slider");
		const run = renderWithWrites(make(p), 100 + MS20 + 10, [{ at: 100, slot: 0, value: 5 }], [
			{ node: slider, port: "out" },
		]);
		const out = run.taps[0] as Float64Array;
		expect(Math.abs((out[out.length - 1] as number) - 1)).toBeLessThanOrEqual(1e-9);
		expect(Math.max(...out)).toBeLessThanOrEqual(1);
	});

	it("a toggle ramps to its new value over the slew", () => {
		const p = program("sin(60).gain(toggle(0)).out()");
		expect(p.liveSlots).toEqual([expect.objectContaining({ init: 0, min: 0, max: 1 })]);
		const toggle = nodeOf(p, "toggle");
		const run = renderWithWrites(make(p), 100 + MS20 + 10, [{ at: 100, slot: 0, value: 1 }], [
			{ node: toggle, port: "out" },
		]);
		const out = run.taps[0] as Float64Array;
		expect(out[99]).toBe(0);
		expect(out[100 + Math.round(MS20 / 4)]).toBeGreaterThan(0);
		expect(out[100 + Math.round(MS20 / 4)]).toBeLessThan(1);
		expect(Math.abs((out[100 + MS20] as number) - 1)).toBeLessThanOrEqual(1e-9);
	});

	it("a toggle with slew 0 jumps in one sample", () => {
		const p = program("sin(60).gain(toggle(0, { slew: secs(0) })).out()");
		const toggle = nodeOf(p, "toggle");
		const run = renderWithWrites(make(p), 150, [{ at: 100, slot: 0, value: 1 }], [
			{ node: toggle, port: "out" },
		]);
		const out = run.taps[0] as Float64Array;
		expect(out[99]).toBe(0);
		expect(out[100]).toBe(1);
	});

	it("a toggle's first sample equals its initial value, with no ramp from 0", () => {
		const p = program("sin(60).gain(toggle(1)).out()");
		const toggle = nodeOf(p, "toggle");
		const run = renderWithWrites(make(p), 10, [], [{ node: toggle, port: "out" }]);
		const out = run.taps[0] as Float64Array;
		expect(out[0]).toBe(1);
	});

	it("a button holds its gate and fires one trigger per press", () => {
		const p = program("sin(60).gain(button()).out()");
		const button = nodeOf(p, "button");
		const release = 100 + MS20 + 200;
		const run = renderWithWrites(
			make(p),
			release + MS20 + 10,
			[
				{ at: 100, slot: 0, value: 1 },
				{ at: release, slot: 0, value: 0 },
			],
			[
				{ node: button, port: "out" },
				{ node: button, port: "trig" },
			],
		);
		const [gate, trig] = run.taps as [Float64Array, Float64Array];
		expect(gate[99]).toBe(0);
		expect(Math.abs((gate[100 + MS20] as number) - 1)).toBeLessThanOrEqual(1e-9);
		expect(Math.abs((gate[release + MS20] as number) - 0)).toBeLessThanOrEqual(1e-9);
		expect([...trig].filter((v) => v === 1)).toHaveLength(1);
		expect(trig[100]).toBe(1);
		expect(trig[101]).toBe(0);
	});

	it("xy has two slots, each written to its own output", () => {
		const p = program(`const pad = xy(0.2, 0.4, 0, 1)
sin(60).gain(pad.x).out()
sin(67).gain(pad.y).out()`);
		const slots = p.liveSlots ?? [];
		expect(slots.map((s) => s.init)).toEqual([0.2, 0.4]);
		expect(slots[0]?.site).not.toBe(slots[1]?.site);
		expect(Math.floor(slots[1]?.site as number)).toBe(slots[0]?.site);
		const pad = nodeOf(p, "xy");
		const run = renderWithWrites(
			make(p),
			100 + 2 * MS20,
			[
				{ at: 50, slot: 1, value: 0.9 },
				{ at: 60, slot: 0, value: 0.1 },
			],
			[
				{ node: pad, port: "x" },
				{ node: pad, port: "y" },
			],
		);
		const [x, y] = run.taps as [Float64Array, Float64Array];
		expect(Math.abs((x[x.length - 1] as number) - 0.1)).toBeLessThanOrEqual(1e-9);
		expect(Math.abs((y[y.length - 1] as number) - 0.9)).toBeLessThanOrEqual(1e-9);
	});

	it("a literal slot changes the gain with no re-eval", () => {
		const code = "sin(60).gain(0.3).out()";
		const site = numberSite(code, 0.3);
		const p = program(code, new Set([site]));
		expect(p.liveSlots).toEqual([{ site, init: 0.3, unit: "sig" }]);
		const run = renderWithWrites(make(p), 2000, [{ at: 0, slot: 0, value: 0.1 }]);
		const ref = renderWithWrites(make(program("sin(60).gain(0.1).out()")), 2000, []);
		expect(firstBitDiff(run.l, ref.l)).toBe(-1);
		expect(firstBitDiff(run.r, ref.r)).toBe(-1);
	});

	it("a literal feeding a ranged input carries that port's unit and range", () => {
		const code = `const echoish = defmod("echoish", { cat: "effects" }, () => {
  return ({ in: x = 0, fb = range(0.5, 0, 1) }) => x * fb
})
sin(60).echoish(0.7).out()`;
		const site = numberSite(code, 0.7);
		const p = program(code, new Set([site]));
		expect(p.liveSlots).toEqual([{ site, init: 0.7, unit: "sig", min: 0, max: 1 }]);
	});
});

describe("slots across engines and re-evals", () => {
	it("interpreter and WASM agree bit for bit for 1 s of writes", () => {
		const p = program(`tempo(120)
const s = seq("c3 e3 g3 b3")
s.tri().lpf(slider(80, 50, 110), 0.3).mul(s.gate.ad(0.01, 0.2)).gain(slider(0.5, 0, 1)).out()`);
		expect(p.liveSlots).toHaveLength(2);
		const writes = [
			{ at: 100, slot: 1, value: 0.8 },
			{ at: 4000, slot: 0, value: 100 },
			{ at: 4001, slot: 1, value: 0.2 },
			{ at: 20000, slot: 0, value: 400 },
			{ at: 30000, slot: 1, value: -2 },
			{ at: 40000, slot: 1, value: 0.7 },
		];
		const js = renderWithWrites(ENGINES.interpreter?.(p) as SlotEngine, SR, writes);
		const wasm = renderWithWrites(ENGINES.wasm?.(p) as SlotEngine, SR, writes);
		expect(firstBitDiff(js.l, wasm.l)).toBe(-1);
		expect(firstBitDiff(js.r, wasm.r)).toBe(-1);
		expect(Math.max(...js.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it("the program does not change on a write", () => {
		const p = program(SLIDER);
		const before = structuredClone(p);
		const engine = ENGINES.wasm?.(p) as SlotEngine;
		renderWithWrites(engine, 300, [{ at: 10, slot: 0, value: 0.8 }]);
		expect(p).toEqual(before);
	});

	it("a literal slot leaves identity as the constant had it", () => {
		const code = "sin(60).gain(0.3).out()";
		const plain = program(code);
		const slotted = program(code, new Set([numberSite(code, 0.3)]));
		const identity = (q: Program) =>
			q.nodes.map((n) => ({ kind: n.kind, place: n.place, upstream: n.upstream, constants: n.constants }));
		expect(identity(slotted)).toEqual(identity(plain));
		expect(plain.liveSlots).toBeUndefined();
	});

	it("a re-eval with the value argument edited keeps the written slot and the state", () => {
		const code = (v: number) => `sin(60).gain(slider(${v}, 0, 1)).lpf(90).out()`;
		const before = program(code(0.5));
		const after = program(code(0.7));
		expect(after.liveSlots?.[0]?.site).toBe(before.liveSlots?.[0]?.site);
		expect(after.liveSlots?.[0]?.init).toBe(0.7);
		const head = 3000;
		const tail = 2000;
		const writes = [{ at: 100, slot: 0, value: 0.8 }];

		// Interpreter: continue a snapshot.
		const js = new InterpreterEngine(before, SR, withProgramSpecs(getRegistry(), before));
		renderWithWrites(js, head, writes);
		const jsNext = new InterpreterEngine(after, SR, withProgramSpecs(getRegistry(), after), js.collectState());
		expect(jsNext.slotValue(0)).toBe(0.8);
		const jsCont = renderWithWrites(js, tail, []);
		const jsSwap = renderWithWrites(jsNext, tail, []);
		expect(firstBitDiff(jsSwap.l, jsCont.l)).toBe(-1);

		// WASM: carry memory to memory.
		const wasm = createWasmEngine(before, SR, getRegistry());
		renderWithWrites(wasm, head, writes);
		const wasmNext = swapWasmEngine(after, SR, getRegistry(), wasm);
		expect(wasmNext.slotValue(0)).toBe(0.8);
		const wasmSwap = renderWithWrites(wasmNext, tail, []);
		expect(firstBitDiff(wasmSwap.l, jsCont.l)).toBe(-1);
	});

	it("a slot whose site is gone starts from its init", () => {
		const before = program(SLIDER);
		const after = program(`sin(60).out({ gain: 0.1 })\n${SLIDER}`);
		const js = new InterpreterEngine(before, SR, withProgramSpecs(getRegistry(), before));
		renderWithWrites(js, 100, [{ at: 10, slot: 0, value: 0.8 }]);
		const next = new InterpreterEngine(after, SR, withProgramSpecs(getRegistry(), after), js.collectState());
		expect(after.liveSlots?.[0]?.site).not.toBe(before.liveSlots?.[0]?.site);
		expect(next.slotValue(0)).toBe(0.5);
	});
});

describe("slot writes on the worklet host", () => {
	it("a write reaches the playing engine, and one sent while a program builds reaches that program", async () => {
		const session = new Session(50);
		const p = program(SLIDER);
		await session.play(p);
		session.untilSwap();
		session.host.writeSlots(serialOf(session), Float64Array.of(0, 0.25));
		session.blocks(20);
		const settled = Math.max(...slice(session.l, session.l.length - BLOCK * 4, session.l.length));
		expect(settled).toBeCloseTo(peakAt(0.25), 2);

		await session.play(program(SLIDER.replace("0.5", "0.6")));
		session.host.writeSlots(serialOf(session), Float64Array.of(0, 0.75));
		const swap = session.untilSwap();
		const building = Math.max(...slice(session.l, swap - BLOCK * 4, swap));
		expect(building, "the playing program keeps its value while the new one builds").toBeCloseTo(
			peakAt(0.25),
			2,
		);
		session.blocks(60);
		const after = Math.max(...slice(session.l, session.l.length - BLOCK * 4, session.l.length));
		expect(after).toBeCloseTo(peakAt(0.75), 2);
	}, 20_000);
});

/** The serial of the session's last program posted: the program slot writes target. */
function serialOf(session: Session): number {
	return session.running?.wasm.serial ?? 0;
}

/** The settled left peak of `sin(60).gain(gain).out()` (out's own level included). */
function peakAt(gain: number): number {
	const { l } = renderWithWrites(ENGINES.interpreter?.(program(`sin(60).gain(${gain}).out()`)) as SlotEngine, 4000, []);
	return Math.max(...l.slice(2000));
}

/** The site of the number literal `value` in `code`. */
function numberSite(code: string, value: number): number {
	const site = evaluatePatch(code).sourceMap.sites.find(
		(s) => s.kind === "number" && s.value === value,
	);
	if (site === undefined) throw new Error(`no number site ${value}`);
	return site.id;
}
