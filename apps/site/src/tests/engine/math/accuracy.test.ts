/**
 * auxlang's math against high-precision references (refs/generate.py,
 * mpmath): the max error in ulps over each function's sweep stays within
 * its documented bound, and special inputs give ECMAScript's exact results.
 */

import { describe, expect, it } from "vitest";

import { mathFunctions } from "@/engine/dsp/bind-math/math-functions";

type Encoded = number | "NaN" | "Infinity" | "-Infinity" | "-0";
interface RefFile {
	readonly name: string;
	readonly arity: number;
	readonly cases: readonly Encoded[][];
}

const REFS = Object.values(
	import.meta.glob<RefFile>("./refs/*.json", { eager: true, import: "default" }),
);

/**
 * Max error in ulps each function may show on its sweep. Measured max in
 * the comment. All are within 1 ulp but the inverse and direct hyperbolics,
 * whose musl formulas are documented at up to 1.6-2 ulp.
 */
const BOUNDS: Readonly<Record<string, number>> = {
	sin: 1, // 0.680
	cos: 1, // 0.667
	tan: 1, // 0.690
	asin: 1, // 0.754
	acos: 1, // 0.819
	atan: 1, // 0.718
	atan2: 1, // 0.995
	exp: 1, // 0.753
	expm1: 1, // 0.719
	exp2: 1, // 0.781
	log: 1, // 0.678
	log2: 1, // 0.577
	log10: 1, // 0.562
	log1p: 1, // 0.714
	pow: 1, // 0.747
	sinh: 1.2, // 1.090
	cosh: 1, // 0.945
	tanh: 1.4, // 1.263
	asinh: 1.2, // 1.091
	acosh: 1.3, // 1.162
	atanh: 1.5, // 1.380
	cbrt: 1, // 0.643
	hypot: 1, // 0.792
};

const fns = mathFunctions();

function decode(v: Encoded): number {
	if (v === "-0") return -0;
	return typeof v === "number" ? v : Number(v);
}

function ulp(v: number): number {
	const a = Math.abs(v);
	if (a < 2.2250738585072014e-308) return 5e-324;
	let u = 2.220446049250313e-16;
	let m = a;
	while (m >= 2) {
		m /= 2;
		u *= 2;
	}
	while (m < 1) {
		m *= 2;
		u /= 2;
	}
	return u;
}

/** Max ulp error of `fn` over `cases`, and the first input where it occurs. */
function worst(fn: (...a: number[]) => number, arity: number, cases: readonly Encoded[][]) {
	let max = 0;
	let at: number[] = [];
	for (const row of cases) {
		const args = row.slice(0, arity).map(decode);
		const hi = decode(row[arity] as Encoded);
		const err = row[arity + 1] as number;
		const got = fn(...args);
		const e = Number.isFinite(hi)
			? Math.abs((got - hi) / ulp(hi) - err)
			: Object.is(got, hi)
				? 0
				: Number.POSITIVE_INFINITY;
		if (!(e <= max)) {
			max = e;
			at = args;
		}
	}
	return { max, at };
}

describe("auxlang math accuracy", () => {
	it("has a reference sweep for every bounded function", () => {
		expect(REFS.map((r) => r.name).sort()).toEqual(Object.keys(BOUNDS).sort());
	});

	it.each(REFS.map((r) => [r.name, r] as const))("%s stays within its ulp bound", (name, ref) => {
		const fn = fns[name];
		expect(fn).toBeDefined();
		if (fn === undefined) return;
		const { max, at } = worst(fn, ref.arity, ref.cases);
		expect(max, `${name}: max ${max.toFixed(3)} ulp at (${at.join(", ")})`).toBeLessThanOrEqual(
			BOUNDS[name] ?? 0,
		);
	});
});

/** Inputs whose results ECMAScript fixes: zeros, infinities, NaN, and their neighbours. */
const SPECIAL = [
	0,
	-0,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
	Number.NaN,
	1,
	-1,
	2,
	-2,
	0.5,
	-0.5,
	3,
	-3,
	5e-324,
	-5e-324,
];

describe("auxlang math special values", () => {
	const host = Math as unknown as Record<string, (...a: number[]) => number>;
	const names = Object.keys(BOUNDS).filter((n) => n !== "exp2");

	it.each(names)("%s gives ECMAScript's zeros, infinities and NaNs", (name) => {
		const ours = fns[name] as (...a: number[]) => number;
		const theirs = host[name] as (...a: number[]) => number;
		const pairs =
			ours.length === 2
				? SPECIAL.flatMap((a) => SPECIAL.map((b) => [a, b]))
				: SPECIAL.map((a) => [a]);
		for (const args of pairs) {
			const want = theirs(...args);
			const got = ours(...args);
			if (Number.isFinite(want) && want !== 0)
				expect(Math.abs(got - want), `${name}(${args})`).toBeLessThanOrEqual(ulp(want));
			else expect(Object.is(got, want), `${name}(${args}) = ${got}, want ${want}`).toBe(true);
		}
	});

	it("2 ** y and pow(2, y) are the same function", () => {
		for (const y of [-1074.5, -3.3, 0.1, 0.5, 7, 1023.9])
			expect(Object.is(fns.pow?.(2, y), fns.exp2?.(y))).toBe(true);
	});
});
