/**
 * hashRandom(key, seed): the same value every time the same key comes back
 * under the same seed — across calls and across renders. Inside a tick it is
 * `hashRandom(key)`, under the patch seed.
 */

import { describe, expect, it } from "vitest";

import { defmod } from "@/engine/patch/defmod";
import { hashRandom as hashRandomSeeded } from "@/engine/random/hash-random";
import { renderTap } from "@/engine/runtime/render";
import { c, pnode } from "../runtime/helpers";

/** The tick's own binding (module/bind-random): one argument, the patch seed implied. */
declare const hashRandom: (key: number | string) => number;

/** Steps through keys 0, 1, 2, … every `hold` samples; outputs each key's value. */
defmod(
	"hr.steps",
	{},
	(() => {
		let n = 0;
		return ({ hold = 100 }: { hold: number }) => {
			const at = n;
			n = n + 1;
			return hashRandom(Math.floor(at / hold));
		};
	}) as never,
);

const steps = (seed: number) => ({
	nodes: [pnode("hr.steps", [{ hold: c(100) }])],
	outs: [],
	seed,
});

describe("hashRandom", () => {
	it("is stable across calls", () => {
		for (const key of [0, 1, 7.5, -3, "kick", ""]) {
			expect(hashRandomSeeded(key, 1)).toBe(hashRandomSeeded(key, 1));
		}
	});

	it("differs across keys", () => {
		const values = [0, 1, 2, 3, 1.25, 1.5, -1, "a", "b"].map((k) => hashRandomSeeded(k, 1));
		expect(new Set(values).size).toBe(values.length);
	});

	it("differs across seeds", () => {
		expect(hashRandomSeeded(3, 1)).not.toBe(hashRandomSeeded(3, 2));
	});

	it("is in [0, 1)", () => {
		for (let k = 0; k < 1000; k++) {
			const v = hashRandomSeeded(k, 9);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it("inside a tick, returns the same value each time a key comes back, under the patch seed", () => {
		const tap = renderTap(steps(7), 0, "out", 0, 500);
		expect(tap[0]).toBe(tap[99]);
		expect(tap[100]).not.toBe(tap[99]);
		expect(tap[150]).toBe(Math.fround(hashRandomSeeded(1, 7)));
		expect(renderTap(steps(8), 0, "out", 0, 500)[150]).toBe(Math.fround(hashRandomSeeded(1, 8)));
	});

	it("inside a tick, is stable across renders", () => {
		expect(renderTap(steps(7), 0, "out", 0, 500)).toEqual(renderTap(steps(7), 0, "out", 0, 500));
	});
});
