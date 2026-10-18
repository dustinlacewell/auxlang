/**
 * Additive modulation (MANIFESTO §5.2): setting a port sets its base;
 * `.mod(port, signal, depth = 1)` adds `signal × depth`, and terms sum.
 * Modulo is `wrap`, so `mod` means modulation.
 */

import "@/engine/modules/all";

import { buildUserScope, defmod, factory, runProgram } from "@/engine/api";
import { handleData } from "@/engine/patch/handle-data";
import { render, renderTap } from "@/engine/runtime/render";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

const saw = factory("saw");
const lfo = factory("lfo");

const renderL = (fn: () => void) => render(runProgram(fn), 0.05).l;

describe(".mod(port, signal, depth)", () => {
	it('lpf({ cutoff: 60 }).mod("cutoff", 1, 12) behaves as cutoff 72', () => {
		const modded = renderL(() => saw(45).lpf({ cutoff: 60 }).mod("cutoff", 1, 12).out());
		const plain = renderL(() => saw(45).lpf({ cutoff: 72 }).out());
		expect(modded).toEqual(plain);
	});

	it("two .mod calls on one port sum", () => {
		const modded = renderL(() =>
			saw(45).lpf({ cutoff: 60 }).mod("cutoff", 1, 6).mod("cutoff", 2, 3).out(),
		);
		const plain = renderL(() => saw(45).lpf({ cutoff: 72 }).out());
		expect(modded).toEqual(plain);
	});

	it("depth defaults to 1", () => {
		const modded = renderL(() => saw(45).lpf({ cutoff: 60 }).mod("cutoff", 12).out());
		const plain = renderL(() => saw(45).lpf({ cutoff: 72 }).out());
		expect(modded).toEqual(plain);
	});

	it("setting the port after .mod sets only its base; the terms stay", () => {
		const modded = renderL(() => saw(45).lpf({ cutoff: 30 }).mod("cutoff", 1, 12).cutoff(60).out());
		const plain = renderL(() => saw(45).lpf({ cutoff: 72 }).out());
		expect(modded).toEqual(plain);
	});

	it("an unset port modulates its declared default", () => {
		const modded = renderL(() => saw(45).lpf().mod("cutoff", -12).out());
		const plain = renderL(() => saw(45).lpf({ cutoff: 72 }).out()); // default 84
		expect(modded).toEqual(plain);
	});

	it("a signal term adds per sample: base + lfo × depth", () => {
		const program = runProgram(() => {
			saw(45).lpf({ cutoff: 60 }).mod("cutoff", lfo(3), 12).out();
		});
		const n = 4800;
		const lfoTap = renderTap(program, nodeIndex(program, "lfo"), "out", 0, n);
		const sumTap = renderTap(program, nodeIndex(program, "add"), "out", 0, n);
		for (let k = 0; k < n; k += 101) {
			expect(sumTap[k]).toBeCloseTo(60 + 12 * (lfoTap[k] as number), 4);
		}
	});

	it("keeps value semantics: the original handle is unchanged", () => {
		let original: unknown;
		const program = runProgram(() => {
			const base = saw(45).lpf({ cutoff: 60 });
			base.mod("cutoff", 1, 12).out();
			original = base;
			base.out();
		});
		expect(handleData(original as never).node.mods).toBeUndefined();
		const cutoffs = program.nodes
			.filter((node) => node.module === "lpf")
			.map((node) => node.lanes[0]?.cutoff?.k);
		expect(cutoffs.sort()).toEqual(["c", "n"]); // the original stays a constant 60
	});

	it('.mod("nope", ...) throws and lists the ports', () => {
		expect(() => runProgram(() => saw(45).lpf().mod("nope", 1).out())).toThrow(
			/lpf\.mod\("nope", \.\.\.\): not an input of 'lpf'\. inputs: \[in, cutoff, res\]/,
		);
	});

	it("a required port with no base has nothing to modulate: loud error", () => {
		expect(() =>
			runProgram(() => {
				const need = defmod("need", {}, (() => {
					return ({ x }: { x: number }) => x;
				}) as never);
				need().mod("x", 1).out();
			}),
		).toThrow(/need\.mod\('x', \.\.\.\): 'x' has no base value/);
	});
});

describe("wrap is modulo; mod is not", () => {
	it("wrap(3) is modulo", () => {
		const program = runProgram(() => {
			saw(45).gain(0).add(7).wrap(3).out();
		});
		const tap = renderTap(program, nodeIndex(program, "wrap"), "out", 0, 1);
		expect(tap[0]).toBe(1);
	});

	it("mod no longer resolves to modulo", () => {
		expect(() => factory("mod")).toThrow(/unknown module 'mod'/);
		expect("mod" in buildUserScope()).toBe(false);
	});
});
