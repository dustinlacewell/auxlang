/**
 * Randomized check of `stable` and `rr` voices: 50 small patterns from a
 * seeded generator, mixing chords, `<>`, `?`, `@`, `every`, `off`, `slow` and
 * `late`. For each, under both policies:
 *
 * - lanes are the same whether cycles are read forward, in reverse, or shuffled;
 * - no two overlapping events share a lane.
 */

import { describe, expect, it } from "vitest";

import type { Pat } from "@/pattern/ast";
import { type Ev, laneOf } from "@/pattern/event";
import { p } from "@/pattern/notation/template";
import type { P } from "@/pattern/pat-class";
import { rcmp, rlt } from "@/pattern/rational";
import { evKey, queryCycles } from "./helpers";

const PATTERNS = 50;
const CYCLES = 8;

/** mulberry32: a small seeded generator. */
function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const NOTES = ["c4", "d4", "e4", "g4", "a4", "c5"];

function generator(seed: number) {
	const next = rng(seed);
	const pick = <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)] as T;
	const note = (): string => pick(NOTES) + (next() < 0.25 ? "?" : "");
	const chord = (): string => `[${Array.from({ length: 2 + Math.floor(next() * 2) }, note).join(",")}]`;
	const element = (): string => {
		const e = pick([note, chord, () => `<${note()} ${chord()}>`, () => "~"])();
		return next() < 0.2 ? `${e}@2` : e;
	};
	const notation = (): string => Array.from({ length: 2 + Math.floor(next() * 3) }, element).join(" ");
	const transform = pick<(q: P) => P>([
		(q) => q,
		(q) => q.every(2, (x) => x.rev()),
		(q) => q.every(3, (x) => x.add(12)),
		(q) => q.off(0.25, (x) => x.add(7)),
		(q) => q.slow(2),
		(q) => q.late(0.5),
		(q) => q.every(2, (x) => x.late(0.5)),
	]);
	return { source: notation(), transform, lanes: 1 + Math.floor(next() * 3) };
}

/** `p` over a plain string. */
const parse = (source: string): P => p(Object.assign([source], { raw: [source] }) as TemplateStringsArray);

const keysOf = (pat: Pat, c: number): string[] =>
	queryCycles(pat, c, c + 1)
		.map((ev) => `${evKey(ev)}@${laneOf(ev)}`)
		.sort();

function readInOrder(build: () => Pat, order: readonly number[]): string[][] {
	const pat = build();
	const byCycle: string[][] = [];
	for (const c of order) byCycle[c] = keysOf(pat, c);
	return byCycle;
}

function overlapsInALane(evs: readonly Ev[]): string | null {
	const byLane = new Map<number, Ev[]>();
	for (const ev of evs) byLane.set(laneOf(ev), [...(byLane.get(laneOf(ev)) ?? []), ev]);
	for (const [lane, list] of byLane) {
		const sorted = [...list].sort((a, b) => rcmp(a.part.begin, b.part.begin));
		for (let i = 1; i < sorted.length; i++) {
			const a = sorted[i - 1] as Ev;
			const b = sorted[i] as Ev;
			if (rlt(b.part.begin, a.part.end)) return `lane ${lane}: ${evKey(a)} overlaps ${evKey(b)}`;
		}
	}
	return null;
}

describe("random patterns under stable and rr", () => {
	const forward = Array.from({ length: CYCLES }, (_, c) => c);
	for (let i = 0; i < PATTERNS; i++) {
		const g = generator(1000 + i);
		for (const policy of ["stable", "rr"] as const) {
			const build = (): Pat => {
				const q = g.transform(parse(g.source));
				return (policy === "rr" ? q.voices("rr", g.lanes) : q.voices("stable")).ast;
			};
			it(`#${i} ${policy}: ${g.source}`, () => {
				const shuffle = rng(i);
				const shuffled = [...forward].sort(() => shuffle() - 0.5);
				const expected = readInOrder(build, forward);
				expect(readInOrder(build, [...forward].reverse())).toEqual(expected);
				expect(readInOrder(build, shuffled)).toEqual(expected);
				const pat = build();
				for (const c of forward) expect(overlapsInALane(queryCycles(pat, c, c + 1))).toBeNull();
			});
		}
	}
});
