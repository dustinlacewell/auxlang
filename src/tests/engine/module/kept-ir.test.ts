/**
 * A patch module's bound tick is read once, at `defmod`, and the result is
 * kept with the spec: the spec the main thread hydrates from the compiled
 * Program carries it, so build reads no text. A copy that crossed by JSON
 * (the worklet's) carries none and is read on first use.
 */

import { describe, expect, it } from "vitest";

import "@/engine/modules/all";
import { compile, factory, out, runEval } from "@/engine/api";
import { getRegistry } from "@/engine/module/define";
import { keptIR } from "@/engine/module/front/module/kept-ir";
import { specIR } from "@/engine/module/front/module/spec-ir";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { ModuleSpec, Program } from "@/engine/types";
import { sig } from "@/engine/types";
import { defineInternalModule } from "../fixtures/internal-module";

const patch = () => {
	defineInternalModule({
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
