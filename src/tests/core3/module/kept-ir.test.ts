/**
 * A patch module's bound tick is read once, at `defmod`, and the result is
 * kept with the spec: the spec the main thread hydrates from the compiled
 * Program carries it, so build reads no text. A copy that crossed by JSON
 * (the worklet's) carries none and is read on first use.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { compile, defmod, factory, out, runEval } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { keptIR } from "@/core3/module/front/module/kept-ir";
import { specIR } from "@/core3/module/front/module/spec-ir";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { ModuleSpec, Program } from "@/core3/types";
import { sig } from "@/core3/types";

const patch = () => {
	defmod({
		name: "shaper",
		category: "effects",
		ins: { in: sig(0) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		tick: (_s, i, o) => {
			o.out = Math.sin(i.in);
		},
	});
	out(factory("saw")(110).shaper());
};

function shaperOf(program: Program): ModuleSpec {
	return withProgramSpecs(getRegistry(), program).get("shaper") as ModuleSpec;
}

describe("kept IR", () => {
	it("a spec hydrated from the compiled Program keeps the IR read at defmod", () => {
		const spec = shaperOf(compile(runEval(patch)));
		const kept = keptIR(spec);
		expect(kept).toBeDefined();
		expect(specIR(spec)).toBe(kept);
	});

	it("a JSON copy keeps none, and is read once on first use", () => {
		const wire = JSON.parse(JSON.stringify(compile(runEval(patch)))) as Program;
		const spec = shaperOf(wire);
		expect(keptIR(spec)).toBeUndefined();
		const ir = specIR(spec);
		expect(specIR(spec)).toBe(ir);
	});
});
