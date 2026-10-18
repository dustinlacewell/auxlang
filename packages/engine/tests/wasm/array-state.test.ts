/**
 * Array state on WASM, bit-identical to the interpreter sample by sample:
 * every typed-array kind stores and loads as JS does (Float32 rounds, the
 * integer kinds wrap, Uint8Clamped clamps and rounds ties to even); an index
 * that is not an integer in [0, length) reads `undefined` (NaN, or the `??`
 * right side) and drops the write, -0 is index 0; nested records and arrays
 * of records keep their fields, also at a run-time index and through a
 * helper.
 */

import { describe, expect, it } from "vitest";

import { runProgram } from "@/api";
import type { Program } from "@/types";
import { sig } from "@/types";
import { defineInternalModule } from "../../testing/internal-module";
import { firstSlotDifference, interpreterSeries } from "./slot-differential";

/** Edge values for every element type: ties, wraps, clamps, f32 overflow and underflow, NaN. */
function kinds(): Program {
	return runProgram(() => {
		const m = defineInternalModule({
			name: "as.kinds",
			category: "utils",
			ins: { in: sig(0) },
			outs: {
				f64: sig(),
				f32: sig(),
				i32: sig(),
				u32: sig(),
				i16: sig(),
				u16: sig(),
				i8: sig(),
				u8: sig(),
				u8c: sig(),
				ret: sig(),
				sum: sig(),
			},
			defaultIn: "in",
			defaultOut: "f64",
			state: () => ({
				vals: Float64Array.of(
					0,
					-0,
					0.1,
					1.5,
					2.5,
					-1.5,
					-2.5,
					0.5,
					127.5,
					128,
					-129,
					254.5,
					255.5,
					256,
					32767.5,
					65535.7,
					65536,
					2147483647.9,
					2147483648,
					4294967301,
					-2147483649,
					1e20,
					-1e20,
					3.4e38,
					3.5e38,
					1e39,
					1e-46,
					1.4e-45,
					Number.NaN,
					Number.POSITIVE_INFINITY,
					Number.NEGATIVE_INFINITY,
				),
				f64: new Float64Array(3),
				f32: Float32Array.of(0.1, -0, 7),
				i32: Int32Array.of(-1, 0, 5),
				u32: new Uint32Array(3),
				i16: new Int16Array(3),
				u16: new Uint16Array(3),
				i8: Int8Array.of(-128, 1, 2),
				u8: new Uint8Array(3),
				u8c: Uint8ClampedArray.of(9, 0, 255),
				n: 0,
			}),
			tick: (s, i, o) => {
				const vals = s.vals as Float64Array;
				const v = (vals[(s.n as number) % vals.length] as number) + i.in;
				const k = (s.n as number) % 3;
				(s.f64 as Float64Array)[k] = v;
				o.f64 = (s.f64 as Float64Array)[k] as number;
				(s.f32 as Float32Array)[k] = v;
				o.f32 = (s.f32 as Float32Array)[k] as number;
				(s.i32 as Int32Array)[k] = v;
				o.i32 = (s.i32 as Int32Array)[k] as number;
				(s.u32 as Uint32Array)[k] = v;
				o.u32 = (s.u32 as Uint32Array)[k] as number;
				(s.i16 as Int16Array)[k] = v;
				o.i16 = (s.i16 as Int16Array)[k] as number;
				(s.u16 as Uint16Array)[k] = v;
				o.u16 = (s.u16 as Uint16Array)[k] as number;
				(s.i8 as Int8Array)[k] = v;
				o.i8 = (s.i8 as Int8Array)[k] as number;
				(s.u8 as Uint8Array)[k] = v;
				o.u8 = (s.u8 as Uint8Array)[k] as number;
				o.ret = (s.u8c as Uint8ClampedArray)[k] = v;
				o.u8c = (s.u8c as Uint8ClampedArray)[k] as number;
				const f32 = s.f32 as Float32Array;
				const i8 = s.i8 as Int8Array;
				const next = (k + 1) % 3;
				f32[next] = (f32[next] as number) + v;
				const last = (k + 2) % 3;
				i8[last] = (i8[last] as number) + 1;
				i8[last]++;
				o.sum =
					((s.f32 as Float32Array)[0] as number) +
					((s.i8 as Int8Array)[1] as number) +
					(s.u8c as Uint8ClampedArray).length;
				s.n = (s.n as number) + 1;
			},
		});
		m().out();
	});
}

/** Valid, out-of-range, fractional, NaN, infinite and -0 indices, constant and run time. */
function indices(): Program {
	return runProgram(() => {
		const m = defineInternalModule({
			name: "as.index",
			category: "utils",
			ins: { in: sig(0) },
			outs: { read: sig(), or: sig(), int: sig(), sum: sig(), fixed: sig(), ret: sig() },
			defaultIn: "in",
			defaultOut: "read",
			state: () => ({
				a: Float32Array.of(1.25, 2.5, 3.75),
				idx: Float64Array.of(
					0,
					-0,
					1,
					2,
					3,
					-1,
					0.5,
					1.5,
					Number.NaN,
					Number.POSITIVE_INFINITY,
					Number.NEGATIVE_INFINITY,
					2.0000000001,
					1e300,
					-0.5,
					4294967296,
				),
				n: 0,
			}),
			tick: (s, i, o) => {
				const a = s.a as Float32Array;
				const idx = s.idx as Float64Array;
				const n = s.n as number;
				const j = (idx[n % idx.length] as number) + i.in;
				o.read = a[j] as number;
				o.or = a[j] ?? -7;
				o.ret = a[j] = n + 0.3;
				a[j] += 0.25;
				a[j]++;
				o.int = a[(n % 5) - (2 | 0)] ?? a[((n % 7) - 3) | 0] ?? 11;
				o.fixed = (a[-0] as number) + (a[5] ?? 100) + (a[1.5] ?? 1000);
				a[1.5] = 9;
				a[3] = 9;
				o.sum = (a[0] as number) + (a[1] as number) + (a[2] as number);
				s.n = n + 1;
			},
		});
		m().out();
	});
}

/** Nested records and an array of records, at constant and run-time indices, and through a helper. */
function records(): Program {
	return runProgram(() => {
		const m = defineInternalModule({
			name: "as.records",
			category: "utils",
			ins: { in: sig(0) },
			outs: { out: sig(), deep: sig(), helper: sig(), first: sig() },
			defaultIn: "in",
			defaultOut: "out",
			helpers: {
				total: (buf: Float32Array, scale: number) => {
					let t = 0;
					for (let k = 0; k < buf.length; k++) t += (buf[k] as number) * scale;
					return t;
				},
			},
			state: () => ({
				voices: [
					{ f: 0.5, buf: Float32Array.of(0.1, -0), g: { x: 3, h: new Int8Array(2) } },
					{ f: -0, buf: new Float32Array(2), g: { x: 0, h: Int8Array.of(7, -7) } },
					{ f: 2, buf: Float32Array.of(1e-3, 9), g: { x: -1, h: new Int8Array(2) } },
				],
				outer: { inner: { y: 1.5, z: new Uint16Array(4) } },
				n: 0,
			}),
			tick: (s, i, o) => {
				const voices = s.voices as Voice[];
				const outer = s.outer as Outer;
				const n = s.n as number;
				const k = (n + i.in) % 3;
				const v = voices[k] as Voice;
				((s.voices as Voice[])[k] as Voice).f = v.f + 0.1;
				((s.voices as Voice[])[k] as Voice).buf[n % 2] = v.f * 1.1;
				((s.voices as Voice[])[k] as Voice).g.x = (v.buf[0] as number) + (v.buf[1] as number);
				((s.voices as Voice[])[k] as Voice).g.h[n % 3] = n * 50;
				(s.outer as Outer).inner.y = outer.inner.y * 1.01;
				(s.outer as Outer).inner.z[n % 4] = n * 1000.5;
				o.out = v.g.x + (v.g.h[0] as number) + voices.length;
				o.first = (voices[0] as Voice).f + (voices[2] as Voice).g.x;
				o.deep = outer.inner.y + (outer.inner.z[(n + 1) % 4] as number);
				o.helper = total(v.buf, 2) + total((voices[1] as Voice).buf, 3);
				s.n = n + 1;
			},
		});
		m().out();
	});
}

/** The tick's own helper binding. */
declare const total: (buf: Float32Array, scale: number) => number;

interface Voice {
	f: number;
	buf: Float32Array;
	g: { x: number; h: Int8Array };
}

interface Outer {
	inner: { y: number; z: Uint16Array };
}

const SAMPLES = 200;

function node(program: Program, module: string): number {
	return program.nodes.findIndex((n) => n.module === module);
}

describe("WASM array state", () => {
	it("stores and loads every typed-array kind as JS does", () => {
		const program = kinds();
		expect(firstSlotDifference(program, SAMPLES)).toBeNull();
		const f32 = interpreterSeries(program, node(program, "as.kinds"), "f32", 31);
		expect(f32).toContain(Math.fround(0.1));
		expect(f32).toContain(Number.POSITIVE_INFINITY);
		const i8 = interpreterSeries(program, node(program, "as.kinds"), "i8", 31);
		expect(i8).toContain(-128);
	});

	it("reads undefined and drops the write at an invalid index; -0 is 0", () => {
		const program = indices();
		expect(firstSlotDifference(program, SAMPLES)).toBeNull();
		const or = interpreterSeries(program, node(program, "as.index"), "or", 15);
		expect(or).toContain(-7);
		expect(
			interpreterSeries(program, node(program, "as.index"), "read", 15).some(Number.isNaN),
		).toBe(true);
	});

	it("lays out nested records and arrays of records", () => {
		expect(firstSlotDifference(records(), SAMPLES)).toBeNull();
	});
});
