/**
 * The patch seed (MANIFESTO §7): `seed(n)` is a setting that pins it; without
 * it the host's play session draws one and keeps it across re-evals; a local
 * `.seed(n)` on a pattern or a module holds that part's randomness whatever
 * the patch seed.
 */

import { describe, expect, it } from "vitest";

import "@/engine/modules/all";
import { factory, p, runEval, runProgram, seed, seq, tempo } from "@/engine/api";
import { degrade, pure, stack, withSeed } from "@/engine/pattern/combinators";
import { getRegistry } from "@/engine/module/define";
import { render, renderTap } from "@/engine/runtime/render";
import { createSeedSession } from "@/engine/runtime/seed-session";
import type { Program } from "@/engine/types";
import { evSet, queryCycles } from "../pattern/helpers";
import { BACKENDS, type TestEngine } from "../runtime/backends";

const noise = factory("noise");
const tri = factory("tri");

/** A patch whose sound depends on the seed twice over: a degraded pattern and noise. */
function randomPatch(): void {
	tempo(120);
	const s = seq(p`c4*8`.degrade(0.5));
	s.tri().mul(s.gate).add(noise().mul(0.1)).out();
}

function nodesOf(program: Program, module: string): number[] {
	return program.nodes.flatMap((n, i) => (n.module === module ? [i] : []));
}

describe("seed(n) setting", () => {
	it("seed(7) renders the same as the eval option seed 7", () => {
		const set = render(
			runProgram(() => {
				randomPatch();
				seed(7);
			}),
			0.5,
		);
		const option = render(runProgram(randomPatch, { seed: 7 }), 0.5);
		expect(set.l).toEqual(option.l);
		expect(render(runProgram(randomPatch, { seed: 8 }), 0.5).l).not.toEqual(set.l);
	});

	it("wins over the host's seed option, and reports that it pinned", () => {
		const evaluated = runEval(
			() => {
				seed(7);
				randomPatch();
			},
			{ seed: 99 },
		);
		expect(evaluated.seed).toBe(7);
		expect(evaluated.seedPinned).toBe(true);
		expect(runEval(randomPatch, { seed: 99 }).seedPinned).toBe(false);
	});

	it("a second seed() is a loud error", () => {
		expect(() =>
			runProgram(() => {
				seed(1);
				seed(2);
			}),
		).toThrow(/seed\(\) is a setting and may appear once per patch/);
	});

	it("a non-integer seed is a loud error", () => {
		expect(() => runProgram(() => seed(1.5))).toThrow(/seed\(n\): a seed must be an integer/);
	});
});

describe("play session seed", () => {
	it("without seed(), two re-evals use the same drawn seed", () => {
		let draws = 0;
		const session = createSeedSession(() => 1000 + draws++);
		const first = runProgram(randomPatch, { seed: session.current() });
		const second = runProgram(randomPatch, { seed: session.current() });
		expect(first.seed).toBe(1000);
		expect(second.seed).toBe(1000);
		expect(render(second, 0.25).l).toEqual(render(first, 0.25).l);
	});

	it("stop ends the session and reroll draws anew", () => {
		let draws = 0;
		const session = createSeedSession(() => 1000 + draws++);
		expect(session.current()).toBe(1000);
		expect(session.reroll()).toBe(1001);
		expect(session.current()).toBe(1001);
		session.end();
		expect(session.current()).toBe(1002);
	});
});

describe.each(BACKENDS)("a seed change during play ($name)", ({ create, swap }) => {
	const SAMPLES = 2000;

	function run(engine: TestEngine, node: number): number[] {
		const frame = new Float32Array(2);
		const out: number[] = [];
		for (let k = 0; k < SAMPLES; k++) {
			engine.tick(frame);
			out.push(engine.peek(node, "out", 0));
		}
		return out;
	}

	/** Play `before`, swap to `after` with migrated state; return the noise after the swap. */
	function swapped(before: Program, after: Program): number[] {
		const [node] = nodesOf(before, "noise");
		const first = create(before, 48000, getRegistry());
		run(first, node as number);
		const second = swap(after, 48000, getRegistry(), first);
		return run(second, node as number);
	}

	/** The first stretch of `program` from a fresh engine. */
	function fromStart(program: Program): number[] {
		const [node] = nodesOf(program, "noise");
		return run(create(program, 48000, getRegistry()), node as number);
	}

	/** The second stretch of `program` from a fresh engine: the stream continued. */
	function continued(program: Program): number[] {
		const [node] = nodesOf(program, "noise");
		const engine = create(program, 48000, getRegistry());
		run(engine, node as number);
		return run(engine, node as number);
	}

	const hiss = (patchSeed: number, local?: number) =>
		runProgram(
			() => {
				const n = noise();
				(local === undefined ? n : n.seed(local)).out();
			},
			{ seed: patchSeed },
		);

	it("a reroll restarts module streams at once", () => {
		expect(swapped(hiss(1), hiss(2))).toEqual(fromStart(hiss(2)));
		expect(swapped(hiss(1), hiss(1))).toEqual(continued(hiss(1)));
	});

	it("an edited local .seed(n) restarts that stream; an unchanged one continues", () => {
		expect(swapped(hiss(1, 3), hiss(1, 4))).toEqual(fromStart(hiss(1, 4)));
		expect(swapped(hiss(1, 3), hiss(1, 3))).toEqual(continued(hiss(1, 3)));
	});
});

describe("local .seed(n) on a pattern", () => {
	const loose = degrade(0.5, pure(1));
	const held = withSeed(9, degrade(0.5, pure(2)));
	const both = stack([loose, held]);
	const valuesOf = (seedValue: number, v: number) =>
		evSet(queryCycles(both, 0, 40, seedValue).filter((e) => e.value === v));

	it("changes only the subtree it is on", () => {
		expect(valuesOf(1, 2)).toEqual(valuesOf(2, 2));
		expect(valuesOf(1, 1)).not.toEqual(valuesOf(2, 1));
	});

	it("p.seed(n) plays as p does under patch seed n", () => {
		expect(evSet(queryCycles(held, 0, 40, 1))).toEqual(
			evSet(queryCycles(degrade(0.5, pure(2)), 0, 40, 9)),
		);
	});

	it("is a P method, and a non-integer seed is a loud error", () => {
		expect(p`c4*8`.degrade(0.5).seed(3).ast).toMatchObject({ op: "seed", seed: 3 });
		expect(() => p`c4`.seed(0.5)).toThrow(/a seed must be an integer/);
	});
});

describe("local .seed(n) on a module", () => {
	/** Two noise roots; only the second carries a local seed. */
	function twoNoises(patchSeed: number): Float32Array[] {
		const program = runProgram(
			() => {
				noise().out();
				noise().seed(3).mul(0.5).out();
			},
			{ seed: patchSeed },
		);
		return nodesOf(program, "noise").map((i) => renderTap(program, i, "out", 0, 1000));
	}

	it("changes only the module it is on", () => {
		const [looseA, heldA] = twoNoises(1);
		const [looseB, heldB] = twoNoises(2);
		expect(heldA).toEqual(heldB);
		expect(looseA).not.toEqual(looseB);
	});

	it("on a seq, holds its pattern's randomness", () => {
		const gates = (patchSeed: number, local: boolean) => {
			const program = runProgram(
				() => {
					tempo(120);
					const loose = seq(p`c4*8`.degrade(0.5));
					const s = local ? loose.seed(4) : loose;
					tri(s).mul(s.gate).out();
				},
				{ seed: patchSeed },
			);
			const [i] = nodesOf(program, "seq");
			return renderTap(program, i as number, "gate", 0, 48000);
		};
		expect(gates(1, true)).toEqual(gates(2, true));
		expect(gates(1, false)).not.toEqual(gates(2, false));
	});

	it("a non-integer seed is a loud error", () => {
		expect(() => runProgram(() => noise().seed(Number.NaN).out())).toThrow(
			/noise\.seed\(n\): a seed must be an integer/,
		);
	});
});
