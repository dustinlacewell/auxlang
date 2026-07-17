/**
 * Bridge-test plumbing: the real module library + program introspection and
 * buffer assertions shared by the end-to-end tests.
 */

import "@/core3/modules/all";
import type { Program } from "@/core3/types";

/** renderTap's fixed sample rate. */
export const SR = 48000;

/** Index of the (first) node running `module`; loud if absent. */
export function nodeIndex(program: Program, module: string): number {
	const i = program.nodes.findIndex((n) => n.module === module);
	if (i === -1) {
		throw new Error(
			`no '${module}' node in program: [${program.nodes.map((n) => n.module).join(", ")}]`,
		);
	}
	return i;
}

export function allFinite(buf: Float32Array): boolean {
	for (const x of buf) if (!Number.isFinite(x)) return false;
	return true;
}

export function countOnes(buf: Float32Array, from = 0, to = buf.length): number {
	let n = 0;
	for (let i = from; i < to; i++) if ((buf[i] as number) === 1) n++;
	return n;
}

export function maxAbs(buf: Float32Array, from = 0, to = buf.length): number {
	let m = 0;
	for (let i = from; i < to; i++) m = Math.max(m, Math.abs(buf[i] as number));
	return m;
}

export function rms(buf: Float32Array, from = 0, to = buf.length): number {
	let s = 0;
	for (let i = from; i < to; i++) s += (buf[i] as number) ** 2;
	return Math.sqrt(s / Math.max(1, to - from));
}
