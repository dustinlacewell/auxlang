/**
 * Generated code travels as data (codegen/binding-path.ts): every unit
 * parameter of a prepared driver names a value by its place in the node
 * runs, and resolves to the matching value of another build of the same
 * program. A host that forbids `new Function` (EvalError under CSP) blocks
 * the driver build with a loud log and the engine runs the interpreter; any
 * other compile error is a generator bug and propagates.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { buildRun } from "@/core3/runtime/build/build-run";
import { pathIndex, resolvePath } from "@/core3/runtime/codegen/binding-path";
import { Core3Engine } from "@/core3/runtime/engine";
import { freshNodeStates } from "@/core3/runtime/fresh-node-states";
import { buildOutputLayout } from "@/core3/runtime/output-slots";
import { prepareProgram } from "@/core3/runtime/prepare/prepare-program";
import type { KeyedIdentity, ModuleSpec, Program } from "@/core3/types";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SR } from "./codegen-harness";

afterEach(() => vi.restoreAllMocks());

const PROGRAM = evalPatch(`tempo(120)
const s = seq("c3 e3 <g3 b3>")
s.saw().lpf(lfo(0.3, 400, 1200)).mul(s.gate.ad(0.01, 0.2)).delay({ time: 0.1, feedback: 0.3, mix: 0.2 }).out()`);

function runsOf(program: Program, identities: readonly KeyedIdentity[]) {
	const registry = getRegistry();
	const layout = buildOutputLayout(program.nodes, registry);
	return program.nodes.map((node, i) => {
		const spec = registry.get(node.module) as ModuleSpec;
		const states = freshNodeStates(
			node,
			spec,
			SR,
			program.seed,
			(identities[i] as KeyedIdentity).key,
		);
		return buildRun(node, i, spec, layout, states);
	});
}

describe("binding paths", () => {
	it("name each bound value, and resolve to the same place in another build", () => {
		const prepared = prepareProgram(PROGRAM, getRegistry(), SR, undefined, {
			codegen: true,
			paste: true,
		});
		const a = runsOf(PROGRAM, prepared.identities);
		const b = runsOf(PROGRAM, prepared.identities);
		const index = pathIndex(a);
		const extras = { block: new Float64Array(1), helpers: [] };
		for (const [value, path] of index) {
			expect(resolvePath(path, a, extras)).toBe(value);
			const other = resolvePath(path, b, extras);
			expect(typeof other).toBe(typeof value);
			if (typeof value === "object") expect(other).not.toBe(value);
		}
		const code = prepared.primary;
		if (code === null) throw new Error("no driver code");
		for (const unit of code.units) for (const p of unit.params) expect(code.paths[p]).toBeDefined();
	});
});

describe("codegen blocked", () => {
	it("an EvalError (CSP) falls back to the interpreter, logs, and renders the same", () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		const reference = render(new Core3Engine(PROGRAM, SR, getRegistry()));
		const Real = globalThis.Function;
		globalThis.Function = new Proxy(Real, {
			construct() {
				throw new EvalError("Refused to evaluate a string as JavaScript");
			},
		});
		let blocked: Core3Engine;
		try {
			blocked = new Core3Engine(PROGRAM, SR, getRegistry(), undefined, { codegen: true });
		} finally {
			globalThis.Function = Real;
		}
		expect(log).toHaveBeenCalledOnce();
		expect(String(log.mock.calls[0]?.[0])).toContain("falling back to the interpreter");
		expect(render(blocked)).toEqual(reference);
	});

	it("any other compile error propagates", () => {
		const Real = globalThis.Function;
		globalThis.Function = new Proxy(Real, {
			construct() {
				throw new SyntaxError("generator bug");
			},
		});
		try {
			expect(
				() => new Core3Engine(PROGRAM, SR, getRegistry(), undefined, { codegen: true }),
			).toThrow("generator bug");
		} finally {
			globalThis.Function = Real;
		}
	});
});

function render(engine: Core3Engine): number[] {
	const l = new Float32Array(2048);
	engine.renderBlock(l, new Float32Array(2048), 0, 2048);
	return [...l];
}
