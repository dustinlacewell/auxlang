/**
 * `loop(init, f)` carries several wires as a record (MANIFESTO §6.1). Each
 * fed-back wire arrives exactly one sample late, the cross-coupled pair
 * renders deterministically, an unchanged re-eval is bit-exact, and a body
 * whose keys differ from init is a loud error naming both key sets.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { factory, loop, out, runEval, runProgram } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { Core3Engine } from "@/engine/runtime/engine";
import type { Program } from "@/engine/types";
import { BACKENDS, type TestEngine, WASM_BACKEND } from "./backends";

const SR = 48000;
const sin = factory("sin");

function run(engine: TestEngine, samples: number): number[] {
	const frame = new Float32Array(2);
	const rendered: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		rendered.push(frame[0] as number, frame[1] as number);
	}
	return rendered;
}

/** The §6.1 cross-FM pair. */
const crossFm = (): Program =>
	runProgram(() => {
		loop({ a: 0, b: 0 }, (fb) => ({
			a: sin(57).mod("pitch", fb.b, 12),
			b: sin(64).mod("pitch", fb.a, 12),
		})).apply((v) => v.a.add(v.b).gain(0.2).out());
	});

describe("loop(init, f): the cross-coupled pair", () => {
	it("renders sound, and renders the same twice", () => {
		const first = run(new Core3Engine(crossFm(), SR, getRegistry()), 4800);
		const second = run(new Core3Engine(crossFm(), SR, getRegistry()), 4800);
		expect(first.every(Number.isFinite)).toBe(true);
		expect(Math.max(...first.map(Math.abs))).toBeGreaterThan(0.05);
		expect(second).toEqual(first);
	});

	it.each(BACKENDS)("is bit-exact across an unchanged re-eval ($name)", ({ create, swap }) => {
		const reference = create(crossFm(), SR, getRegistry());
		run(reference, 3000);
		const expected = run(reference, 2000);
		const head = create(crossFm(), SR, getRegistry());
		run(head, 3000);
		const swapped = swap(crossFm(), SR, getRegistry(), head);
		const got = run(swapped, 2000);
		expect(got.every((v, i) => Object.is(v, expected[i]))).toBe(true);
	});
});

describe("loop(init, f): each wire is one sample late", () => {
	/** Wire `late` is the fed-back copy of wire `early`, which is a plain sine. */
	const delayedCopy = (early: "a" | "b", late: "a" | "b"): Program =>
		runProgram(() => {
			loop({ a: 0, b: 0 }, (fb) => ({
				[early]: sin(60),
				[late]: fb[early].mul(1),
			})).apply((v) => out({ l: v[early], r: v[late] }));
		});

	for (const [early, late] of [
		["a", "b"],
		["b", "a"],
	] as const) {
		it(`fb.${early} read through wire '${late}' is ${early}'s previous sample`, () => {
			const program = delayedCopy(early, late);
			const engine = new Core3Engine(program, SR, getRegistry());
			const source = program.nodes.findIndex((n) => n.module === "sin");
			const copy = program.nodes.findIndex((n) => n.module === "mul");
			let previous = 0;
			for (let k = 0; k < 64; k++) {
				run(engine, 1);
				expect(engine.peek(copy, "out", 0)).toBe(previous);
				previous = engine.peek(source, "out", 0);
			}
			expect(previous).not.toBe(0);
		});
	}
});

describe("loop(init, f): start values", () => {
	/** A wire that halves its own previous sample, starting at 0.5. */
	const decay = (): Program =>
		runProgram(() => {
			loop({ a: 0.5 }, (fb) => ({ a: fb.a.mul(0.5) })).apply((v) =>
				v.a.add(sin(60).mul(0.1)).out(),
			);
		});

	it("the wire reads its start value on sample 0 (interpreter)", () => {
		const program = decay();
		const engine = new Core3Engine(program, SR, getRegistry());
		const wire = program.nodes.findIndex((n) => n.module === "z1");
		run(engine, 1);
		expect(engine.peek(wire, "out", 0)).toBe(0.5);
		run(engine, 1);
		expect(engine.peek(wire, "out", 0)).toBe(0.25);
	});

	it("an unchanged re-eval is bit-exact: a matched wire carries, it does not restart (interpreter)", () => {
		const build = (prev?: TestEngine) =>
			new Core3Engine(decay(), SR, getRegistry(), prev?.collectState());
		const reference = build();
		run(reference, 40);
		const expected = run(reference, 40);
		const head = build();
		run(head, 40);
		const got = run(build(head), 40);
		expect(got.every((v, i) => Object.is(v, expected[i]))).toBe(true);
	});

	it("an unchanged re-eval is bit-exact on WASM: a matched wire carries, it does not restart", () => {
		const reference = WASM_BACKEND.create(decay(), SR, getRegistry());
		run(reference, 40);
		const expected = run(reference, 40);
		const head = WASM_BACKEND.create(decay(), SR, getRegistry());
		run(head, 40);
		const got = run(WASM_BACKEND.swap(decay(), SR, getRegistry(), head), 40);
		expect(got.every((v, i) => Object.is(v, expected[i]))).toBe(true);
	});
});

describe("loop(init, f): loud errors", () => {
	it("returned keys that differ from init name both key sets", () => {
		expect(() =>
			runEval(() => {
				loop({ a: 0, b: 0 }, (fb) => ({ a: fb.b.mul(1), c: fb.a.mul(1) }));
			}),
		).toThrow(/returned keys \[a, c\].*init names \[a, b\]/);
	});

	it("a start value that is not a finite number is refused", () => {
		expect(() =>
			runEval(() => {
				loop({ a: Number.NaN }, (fb) => ({ a: fb.a.mul(1) }));
			}),
		).toThrow(/wire 'a' starts at NaN/);
	});

	it("a wire that is not a handle is refused", () => {
		expect(() =>
			runEval(() => {
				loop({ a: 0 }, () => ({ a: 3 }));
			}),
		).toThrow(/wire 'a' must be a handle/);
	});

	it("an unknown name on the result record is loud", () => {
		expect(() =>
			runEval(() => {
				const wires = loop({ a: 0 }, (fb) => ({ a: fb.a.mul(1) }));
				return (wires as unknown as Record<string, unknown>).nope;
			}),
		).toThrow(/'nope' is not a wire\. Wires: \[a\]/);
	});
});
