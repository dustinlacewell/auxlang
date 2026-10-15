/**
 * `loop(init, f)` carries several wires as a record (MANIFESTO §6.1). Each
 * fed-back wire arrives exactly one sample late, the cross-coupled pair
 * renders deterministically, an unchanged re-eval is bit-exact, and a body
 * whose keys differ from init is a loud error naming both key sets.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { factory, loop, out, runEval, runProgram } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import type { Program } from "@/core3/types";

const SR = 48000;
const sin = factory("sin");

function run(engine: Core3Engine, samples: number): number[] {
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

	it("is bit-exact across an unchanged re-eval", () => {
		const reference = new Core3Engine(crossFm(), SR, getRegistry());
		run(reference, 3000);
		const expected = run(reference, 2000);
		const head = new Core3Engine(crossFm(), SR, getRegistry());
		run(head, 3000);
		const swapped = new Core3Engine(crossFm(), SR, getRegistry(), head.collectState());
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

describe("loop(init, f): loud errors", () => {
	it("returned keys that differ from init name both key sets", () => {
		expect(() =>
			runEval(() => {
				loop({ a: 0, b: 0 }, (fb) => ({ a: fb.b.mul(1), c: fb.a.mul(1) }));
			}),
		).toThrow(/returned keys \[a, c\].*init names \[a, b\]/);
	});

	it("a non-zero init value is refused", () => {
		expect(() =>
			runEval(() => {
				loop({ a: 0.5 }, (fb) => ({ a: fb.a.mul(1) }));
			}),
		).toThrow(/wire 'a' starts at 0.5/);
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
