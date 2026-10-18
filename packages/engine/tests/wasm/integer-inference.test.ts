/**
 * The plan's integer ranges (module/front/types/int-range.ts), as the WASM
 * emitter uses them: a value proven to
 * be an integer in int32 lives in an i32, one within ±2^53 in an i64, and
 * everything else stays an exact JS f64. Each helper here runs on WASM next
 * to its JS original over edge inputs; the local types show what was
 * typed. A counter bounded by a constant is an i32; a bound that may be
 * fractional, -0 and NaN are never integers; a sum that leaves int32 is an
 * i64, a product that leaves ±2^53 an f64. A module differential covers
 * indices that may be out of range and integer array state.
 */

import { describe, expect, it } from "vitest";

import { runProgram } from "@/api";
import { analyseLibrary } from "@/dsp/front/module/analyse-library";
import type { Program } from "@/types";
import { sig } from "@/types";
import { compileHelper } from "@/wasm/compile/compile-helper";
import { FunctionTable } from "@/wasm/compile/function-table";
import { Functions } from "@/wasm/compile/functions";
import { helperSet } from "@/wasm/compile/helper-set";
import { I32, I64 } from "@/wasm/encode/opcodes";
import { defineInternalModule } from "../../testing/internal-module";
import { exportFunctions } from "./function-module";
import { firstSlotDifference } from "./slot-differential";

const INPUTS = [
	0,
	-0,
	1,
	-1,
	0.5,
	-0.5,
	2.5,
	-4,
	7,
	1e3,
	2 ** 31 - 1,
	-(2 ** 31),
	2 ** 31,
	-(2 ** 31) - 1,
	2 ** 32 + 5,
	-(2 ** 32) - 5,
	2 ** 53,
	1e300,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];

const HELPERS: Readonly<Record<string, string>> = {
	counted: `function counted(x) {
	let s = 0;
	for (let k = 0; k < 8; k++) s += x * k;
	for (let k = 10; k >= 3; k -= 2) s += k;
	return s;
}`,
	fractionalBound: `function fractionalBound(x) {
	let s = 0;
	for (let k = 0; k < x && k < 50; k++) s += k;
	return s;
}`,
	wide: `function wide(x) {
	const a = x | 0;
	const b = a + a;
	const c = b * b * b;
	const d = (a >>> 4) * (a & 0x7fffffff);
	const e = b > 3 ? b : 3;
	return b + c / 1e9 + (d % 1000) + (d + 1 - d) + Math.max(e, a) + (b < a ? 1 : 0) + ((b & 7) | 0);
}`,
	unsigned: `function unsigned(x) {
	const u = x >>> 0;
	const v = (u % 1000) + u;
	return v + (v >>> 1);
}`,
	negZero: `function negZero(x) {
	const a = x | 0;
	const m = a * -1;
	const r = a % 4;
	const n = -a;
	return (1 / m < 0 ? 1 : 0) + (1 / r < 0 ? 2 : 0) + (1 / n < 0 ? 4 : 0) + m + r + n;
}`,
	floored: `function floored(x) {
	const n = Math.floor(x);
	return n + 1;
}`,
	toInt: `function toInt(x) {
	return (x | 0) + (x >>> 0) + (x >> 1) + (x & 255) * 2;
}`,
	mixed: `function mixed(x) {
	const a = x & 1023;
	const b = (a * 3) % 7;
	const c = a > 500 ? a - 1000 : a;
	return Math.min(a, b, 9) + Math.max(c, -3) + Math.abs(c) + Math.floor(c) + (a >>> 1);
}`,
};

const wasm = exportFunctions(
	(calls) =>
		Object.fromEntries(
			Object.keys(HELPERS).map((name) => [name, calls.helper(name, [{ k: "run", kind: "f64" }])]),
		),
	HELPERS,
);

/** Every helper, compiled from its own text, against its JS original. */
const js: Record<string, (x: number) => number> = Object.fromEntries(
	Object.entries(HELPERS).map(([name, text]) => [name, new Function(`return ${text}`)()]),
);

function localsOf(name: string, type: number): number {
	const set = helperSet("test", analyseLibrary("test", HELPERS));
	const fns = new Functions(new FunctionTable(0));
	const fn = compileHelper(set, name, [{ k: "run", kind: "f64" }], fns.calls(set));
	return fn.locals.filter((t) => t === type).length;
}

const i32Locals = (name: string): number => localsOf(name, I32);
const i64Locals = (name: string): number => localsOf(name, I64);

function expectSameAsJs(name: string): void {
	for (const x of INPUTS) {
		const got = wasm[name]?.(x);
		const want = js[name]?.(x);
		expect(Object.is(got, want), `${name}(${x}): wasm ${got}, js ${want}`).toBe(true);
	}
}

describe("WASM integer typing", () => {
	it("a counter bounded by constants is an i32, up and down", () => {
		expect(i32Locals("counted")).toBe(2);
		expectSameAsJs("counted");
	});

	it("a counter bounded by a number that may be fractional stays an f64", () => {
		expect(i32Locals("fractionalBound")).toBe(0);
		expectSameAsJs("fractionalBound");
	});

	it("a value that leaves int32 is an i64; one that leaves ±2^53 stays an f64", () => {
		expect(i32Locals("wide")).toBe(1);
		expect(i64Locals("wide")).toBeGreaterThanOrEqual(2);
		expectSameAsJs("wide");
	});

	it("uint32 values are i64 and stay exact", () => {
		expect(i64Locals("unsigned")).toBe(2);
		expectSameAsJs("unsigned");
	});

	it("-0 is never an integer: a product with a negative, a remainder of a negative, a negation", () => {
		expect(i32Locals("negZero")).toBe(1);
		expectSameAsJs("negZero");
	});

	it("NaN is never an integer: Math.floor of a number stays an f64", () => {
		expect(i32Locals("floored")).toBe(0);
		expectSameAsJs("floored");
	});

	it("ToInt32 inline matches JS on every edge", () => {
		expectSameAsJs("toInt");
	});

	it("int32 arithmetic, remainder, select, min, max, abs and shifts match JS", () => {
		expect(i32Locals("mixed")).toBeGreaterThanOrEqual(3);
		expectSameAsJs("mixed");
	});
});

/** Integer array state through counters: in-range, possibly out-of-range and descending indices. */
function ring(): Program {
	return runProgram(() => {
		const m = defineInternalModule({
			name: "ii.ring",
			category: "utils",
			ins: { in: sig(0) },
			outs: { out: sig(), edge: sig(), wide: sig(), small: sig() },
			defaultIn: "in",
			defaultOut: "out",
			state: () => ({
				buf: new Float32Array(7),
				off: Int32Array.of(0, 2, 5),
				len: Int32Array.of(2, 3, 2),
				idx: new Int32Array(3),
				big: Int32Array.of(2147483647, 2147483647, -2147483648),
				u: Uint32Array.of(4294967295, 7),
				small: new Int8Array(4),
				n: 0,
			}),
			tick: (s, i, o) => {
				const buf = s.buf as Float32Array;
				const off = s.off as Int32Array;
				const len = s.len as Int32Array;
				const idx = s.idx as Int32Array;
				let acc = 0;
				for (let c = 0; c < len.length; c++) {
					const at = (off[c] as number) + (idx[c] as number);
					acc += buf[at] as number;
					buf[at] = i.in + acc * 0.5 + c;
					const l = len[c] as number;
					idx[c] = (idx[c] as number) + 1 === l ? 0 : (idx[c] as number) + 1;
				}
				o.out = acc;
				let edge = 0;
				for (let k = 0; k <= len.length; k++) edge += (len[k] ?? 0.5) + (off[k + 1] ?? 0.25);
				for (let k = 3; k > -2; k--) {
					idx[k] = idx[k] ?? 9;
					edge += idx[k] ?? 100;
				}
				o.edge = edge;
				const big = s.big as Int32Array;
				const u = s.u as Uint32Array;
				o.wide = (big[0] as number) + (big[1] as number) - (big[2] as number) + (u[0] as number);
				const small = s.small as Int8Array;
				const n = s.n as number;
				for (let k = 0; k < small.length; k++) small[k] = (small[k] as number) + 100 * k + n;
				o.small = (small[0] as number) + (small[3] as number);
				s.n = n + 1;
			},
		});
		m().out();
	});
}

describe("WASM integer typing in a module", () => {
	it("ring buffers, out-of-range and descending counters, wide sums and wrapping stores", () => {
		expect(firstSlotDifference(ring(), 64)).toBeNull();
	});
});
