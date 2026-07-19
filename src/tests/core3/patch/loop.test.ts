/**
 * Feedback legality. `loop(f)` routes the body output back through a `z1`
 * placeholder as a z-edge (read one sample late) — a cycle that PASSES through a
 * unit delay compiles. A cycle with no z-edge is a loud error.
 */

import { compile, factory, loop, runEval, runProgram } from "@/core3/api";
import type { GNode } from "@/core3/graph/node";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

describe("loop() z-edge", () => {
	it("compiles: the back-edge becomes a z-source and is topo-cut", () => {
		const program = runProgram(() => {
			const tlpf = factory("tlpf");
			// feedback through a filter, closed by loop's z1
			loop((s) => s.tlpf(800)).out();
		});

		const z1 = program.nodes.find((n) => n.module === "z1");
		expect(z1).toBeDefined();

		// z1's input is a z-edge pointing at the tlpf body output.
		const zSrc = z1!.lanes[0]!.in;
		expect(zSrc).toMatchObject({ k: "z", port: "out" });

		// No plain "n" edge closes the cycle — toposort succeeded because the
		// only back-reference is the z-edge.
		const filters = program.nodes.filter((n) => n.module === "tlpf");
		expect(filters).toHaveLength(1);
	});

	it("returns a handle usable for chaining and .out()", () => {
		expect(() =>
			runEval(() => {
				loop((s) => s.tlpf(800))
					.tlpf(400)
					.out();
			}),
		).not.toThrow();
	});
});

describe("z-less cycle", () => {
	it("errors loudly, naming the nodes on the cycle", () => {
		// Hand-build a plain (non-z) cycle a.in <- b.out, b.in <- a.out.
		const a: GNode = { module: "tlpf", inputs: {}, config: {} };
		const b: GNode = { module: "tlpf", inputs: {}, config: {} };
		a.inputs.in = { node: b, port: "out" };
		b.inputs.in = { node: a, port: "out" };
		const root: GNode = { module: "out", inputs: { in: { node: a, port: "out" } }, config: {} };

		expect(() => compile({ roots: [root], clock: null, seed: 1, specs: new Map() })).toThrow(
			/cycle without a unit delay.*tlpf.*tlpf/s,
		);
	});
});
