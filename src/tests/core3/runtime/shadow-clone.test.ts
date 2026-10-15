/**
 * The shadow copy of a driver's bound values: data is copied deep, so the
 * shadow never writes what the real driver reads; functions and class
 * instances are shared; one cloner keeps aliasing across the whole set.
 */

import { shadowCloner } from "@/core3/runtime/build/shadow-clone";
import { describe, expect, it } from "vitest";

describe("shadowCloner", () => {
	it("copies plain objects, arrays and typed arrays deep", () => {
		const state = { phase: 0.5, buf: new Float32Array([1, 2]), list: [{ x: 1 }] };
		const copy = shadowCloner()(state) as typeof state;
		expect(copy).toEqual(state);
		expect(copy).not.toBe(state);
		expect(copy.buf).not.toBe(state.buf);
		expect(copy.list[0]).not.toBe(state.list[0]);
		copy.buf[0] = 9;
		expect(state.buf[0]).toBe(1);
	});

	it("shares functions and class instances", () => {
		class Pattern {}
		const fn = () => 1;
		const slot = { fn, pattern: new Pattern(), state: {} };
		const copy = shadowCloner()(slot) as typeof slot;
		expect(copy.fn).toBe(fn);
		expect(copy.pattern).toBe(slot.pattern);
		expect(copy.state).not.toBe(slot.state);
	});

	it("keeps aliasing: a value reached twice is one copy, across calls of one cloner", () => {
		const shared = { n: 1 };
		const clone = shadowCloner();
		const a = clone({ left: shared, right: shared }) as { left: object; right: object };
		expect(a.left).toBe(a.right);
		expect(clone(shared)).toBe(a.left);
		expect(shadowCloner()(shared)).not.toBe(a.left);
	});

	it("copies a cycle", () => {
		const node: { self?: unknown } = {};
		node.self = node;
		const copy = shadowCloner()(node) as { self: unknown };
		expect(copy.self).toBe(copy);
		expect(copy).not.toBe(node);
	});
});
