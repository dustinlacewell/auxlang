/**
 * Dead-chain honesty. `let a = tosc(440); a.freq(880).out()` — the setter
 * returns a COPY that is rooted; the original `a` is never reached and must be
 * absent. The program is exactly: the copy + the out node.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { mod, runProgram } from "@/core3/api";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

describe("dead-chain honesty", () => {
	it("roots only the copy, not the discarded original", () => {
		const program = runProgram(() => {
			const tosc = mod("tosc");
			const a = tosc(440);
			a.freq(880).out();
		});

		// Exactly two nodes: the tosc copy (freq=880) and the out.
		expect(program.nodes).toHaveLength(2);

		const oscs = program.nodes.filter((n) => n.module === "tosc");
		expect(oscs).toHaveLength(1);
		expect(oscs[0]!.lanes[0]!.freq).toEqual({ k: "c", v: 880 });

		const outs = program.nodes.filter((n) => n.module === "out");
		expect(outs).toHaveLength(1);
	});
});
