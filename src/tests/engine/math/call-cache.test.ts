/**
 * The math call cache (module/bind-math/cache-call.ts) is invisible: a bound
 * call returns the same bits as the uncached library function on every call,
 * whatever came before it. The sweeps repeat and alternate arguments, and mix
 * +0/-0, NaN, infinities and subnormals, so a hit on a wrong key shows.
 */

import { describe, expect, it } from "vitest";

import { bindLambdaMath } from "@/engine/dsp/bind-math/bind-lambda-math";
import { lambdaWrapper } from "@/engine/dsp/bind-math/lambda-wrapper";
import { mathFunctions } from "@/engine/dsp/bind-math/math-functions";

type Fn = (...args: number[]) => number;

const m = mathFunctions() as Readonly<Record<string, Fn>>;
const lib = (name: string): Fn => m[name] as Fn;

/** A function text bound to auxlang math with its caches, built as the engine builds a lambda. */
function bound(src: string): Fn {
	return new Function(`"use strict"; return (${lambdaWrapper(bindLambdaMath(src))});`)() as Fn;
}

const SPECIAL = [0, -0, 0, -0, -0, 0, Number.NaN, Number.NaN, 0, 1, 1, -1, 1, -1, -1];
const EDGES = [Infinity, -Infinity, 5e-324, -5e-324, 1e308, -1e308, 0.5, 0.5, -0.5];

/** Repeated, alternating and edge values: each value appears in runs and between others. */
function sweep(): number[] {
	const out = [...SPECIAL, ...EDGES];
	let seed = 12345;
	for (let i = 0; i < 200; i++) {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		const x = (seed / 2147483648 - 0.5) * 20;
		out.push(x, x, -x, x, 0, x, -0);
	}
	return out;
}

/** Every ordered pair from a small value set: repeated, swapped, and with each sign flipped. */
function pairSweep(): [number, number][] {
	const values = [0, -0, 1, -1, 2, 0.5, Number.NaN, Infinity, -Infinity, 3];
	const pairs: [number, number][] = [];
	for (const a of values) for (const b of values) pairs.push([a, b], [a, b]);
	for (const a of values) for (const b of values) pairs.push([a, b], [b, a], [a, b]);
	for (const a of values) for (const b of values) pairs.push([a, b], [-a, b], [a, -b], [-a, -b]);
	return pairs;
}

function expectSameBits(actual: number, expected: number, what: string): void {
	if (!Object.is(actual, expected)) throw new Error(`${what}: got ${actual}, expected ${expected}`);
}

describe("math call cache", () => {
	it.each(["sin", "cos", "tan", "exp", "log", "tanh", "atan", "cbrt", "expm1", "log1p"])(
		"%s: a name argument",
		(name) => {
			const f = bound(`(x) => Math.${name}(x)`);
			for (const x of sweep()) expectSameBits(f(x), lib(name)(x), `${name}(${x})`);
		},
	);

	it.each(["sin", "exp", "tanh"])("%s: an evaluated argument (held in a temp)", (name) => {
		const f = bound(`(x) => (Math.${name}(x * 1))`);
		for (const x of sweep()) expectSameBits(f(x), lib(name)(x * 1), `${name}(${x})`);
	});

	it.each(["pow", "atan2", "hypot"])("%s: two arguments, every pair", (name) => {
		const f = bound(`(x, y) => Math.${name}(x, y)`);
		for (const [x, y] of pairSweep())
			expectSameBits(f(x, y), lib(name)(x, y), `${name}(${x}, ${y})`);
	});

	it("** with two names, a literal base and nested powers", () => {
		const f = bound("(x, y) => x ** y + 2 ** (x - y) + x ** y ** 0.5");
		const pow = lib("pow");
		for (const [x, y] of pairSweep()) {
			const expected = pow(x, y) + pow(2, x - y) + pow(x, pow(y, 0.5));
			expectSameBits(f(x, y), expected, `(${x}, ${y})`);
		}
	});

	it("nested calls and an all-literal call", () => {
		const f = bound("(x) => { return Math.sin(Math.cos(x)) * Math.exp(-1); }");
		for (const x of sweep())
			expectSameBits(f(x), lib("sin")(lib("cos")(x)) * lib("exp")(-1), `(${x})`);
	});

	it("an argument that assigns: earlier names are read before it", () => {
		const f = bound("(x) => { let y = x; return Math.pow(y, (y = y + 1)) + y; }");
		for (const x of sweep()) expectSameBits(f(x), lib("pow")(x, x + 1) + (x + 1), `(${x})`);
	});

	it("each built function keeps its own cache", () => {
		const src = "(x) => Math.sin(x)";
		const a = bound(src);
		const b = bound(src);
		for (const x of sweep()) {
			expectSameBits(a(x), lib("sin")(x), `a(${x})`);
			expectSameBits(b(-x), lib("sin")(-x), `b(${-x})`);
		}
	});

	it("rejects written source that uses a cache name", () => {
		const src = "(x) => { const __mc0_r = 1; return Math.sin(x) + __mc0_r; }";
		expect(() => bindLambdaMath(src)).toThrow(/reserved for auxlang math/);
	});
});
