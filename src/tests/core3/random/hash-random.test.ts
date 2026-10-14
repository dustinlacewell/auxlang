/**
 * hashRandom(key, seed): the same value every time the same key comes back
 * under the same seed — across calls and across renders.
 */

import { describe, expect, it } from "vitest";

import { defmod } from "@/core3/patch/defmod";
import { hashRandom } from "@/core3/random/hash-random";
import { renderTap } from "@/core3/runtime/render";
import { sig } from "@/core3/types";
import { c, pnode } from "../runtime/helpers";

/** Steps through keys 0, 1, 2, … every `hold` samples; outputs each key's value. */
defmod({
	name: "hr.steps",
	category: "utils",
	ins: { hold: sig(100) },
	outs: { out: sig() },
	defaultIn: "hold",
	defaultOut: "out",
	config: { seed: 7 },
	state: () => ({ n: 0 }),
	tick: (s, i, o, cfg) => {
		const n = s.n as number;
		s.n = n + 1;
		o.out = hashRandom(Math.floor(n / i.hold), cfg.seed as number);
	},
});

const steps = (seed: number) => ({
	nodes: [pnode("hr.steps", [{ hold: c(100) }], { config: { seed } })],
	outs: [],
	seed: 1,
});

describe("hashRandom", () => {
	it("is stable across calls", () => {
		for (const key of [0, 1, 7.5, -3, "kick", ""]) {
			expect(hashRandom(key, 1)).toBe(hashRandom(key, 1));
		}
	});

	it("differs across keys", () => {
		const values = [0, 1, 2, 3, 1.25, 1.5, -1, "a", "b"].map((k) => hashRandom(k, 1));
		expect(new Set(values).size).toBe(values.length);
	});

	it("differs across seeds", () => {
		expect(hashRandom(3, 1)).not.toBe(hashRandom(3, 2));
	});

	it("is in [0, 1)", () => {
		for (let k = 0; k < 1000; k++) {
			const v = hashRandom(k, 9);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it("returns the same value each time a key comes back inside a render", () => {
		const tap = renderTap(steps(7), 0, "out", 0, 500);
		expect(tap[0]).toBe(tap[99]);
		expect(tap[100]).not.toBe(tap[99]);
		expect(tap[150]).toBe(Math.fround(hashRandom(1, 7)));
	});

	it("is stable across renders", () => {
		expect(renderTap(steps(7), 0, "out", 0, 500)).toEqual(renderTap(steps(7), 0, "out", 0, 500));
	});
});
