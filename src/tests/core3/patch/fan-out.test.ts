/**
 * Fan-out via a shared variable is ONE node with two consumers — object
 * identity is graph identity, so reusing a handle does not duplicate the node.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { mod, out, runProgram } from "@/core3/api";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

describe("fan-out via shared variable", () => {
	it("compiles a shared source to one node with two consumers", () => {
		const program = runProgram(() => {
			const tosc = mod("tosc");
			const src = tosc(220); // one oscillator...
			out(src.tlpf(800)); // ...into two filters
			out(src.tlpf(2000));
		});

		const oscs = program.nodes.filter((n) => n.module === "tosc");
		expect(oscs).toHaveLength(1);

		const filters = program.nodes.filter((n) => n.module === "tlpf");
		expect(filters).toHaveLength(2);

		// Both filters' `in` reference the same osc node index.
		const oscIndex = program.nodes.indexOf(oscs[0]!);
		const inSrcs = filters.map((f) => f.lanes[0]!.in);
		for (const src of inSrcs) {
			expect(src).toMatchObject({ k: "n", node: oscIndex, port: "out" });
		}
	});
});
