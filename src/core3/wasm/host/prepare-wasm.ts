/**
 * From a Program to WASM bytes plus the values an instance starts from:
 * the engine is built as the offline host builds it (prepare, then every
 * build step), and its runs, slots, live slots and taps are compiled.
 *
 * Against running identities (a re-eval), the program is matched as the JS
 * engine matches it, so each node gets the same migration key, seed and
 * fresh state. `prepareWasmSwap` also plans the carry from the running
 * engine's layout and facts (carry-plan.ts), for `WasmEngine.handOver`.
 */

import { getRegistry } from "../../module/define";
import { specIR } from "../../module/front/module/spec-ir";
import { EngineBuild } from "../../runtime/build/engine-build";
import { withProgramSpecs } from "../../runtime/hydrate-specs";
import { monitorPlan } from "../../runtime/live/monitor-plan";
import { watchList } from "../../runtime/live/watch-list";
import { slotOf } from "../../runtime/output-slots";
import { type PreparedProgram, prepareProgram } from "../../runtime/prepare/prepare-program";
import { specialiseNodes } from "../../runtime/specialise/specialise-nodes";
import type { KeyedIdentity, Program, Registry } from "../../types";
import { type CompiledWasm, type WasmInput, compileWasm } from "../program/compile-program";
import { lambdaSources } from "../program/lambda-sources";
import { type CarrySide, planCarry } from "./carry-plan";
import { type EngineFacts, engineFacts } from "./engine-facts";
import type { WasmStart } from "./wasm-engine";

export interface PreparedWasm {
	readonly compiled: CompiledWasm;
	readonly start: WasmStart;
	readonly facts: EngineFacts;
	/** The hand-over's copies from the running engine (carry-plan.ts); null when nothing runs. */
	readonly carry: Int32Array | null;
}

export function prepareWasm(
	program: Program,
	sampleRate: number,
	registry: Registry = getRegistry(),
	running?: readonly KeyedIdentity[],
	monitor = false,
): PreparedWasm {
	const layered = withProgramSpecs(registry, program);
	return prepareWasmFrom(prepareProgram(program, layered, sampleRate, running, monitor), layered);
}

/**
 * From a program prepared for the engine build and the
 * registry with its specs: build it, then compile. The worklet builds the
 * same prepared program into the same start values.
 */
export function prepareWasmFrom(prepared: PreparedProgram, layered: Registry): PreparedWasm {
	const built = wasmInputOf(prepared, layered);
	return {
		compiled: compileWasm(built.input),
		start: built.start,
		facts: built.facts,
		carry: null,
	};
}

/** Prepare `program` to take over from the running engine `running` at a swap. */
export function prepareWasmSwap(
	program: Program,
	sampleRate: number,
	registry: Registry,
	running: CarrySide,
): PreparedWasm {
	const prepared = prepareWasm(program, sampleRate, registry, running.facts.identities);
	const side = { layout: prepared.compiled.layout, facts: prepared.facts };
	return { ...prepared, carry: planCarry(running, side) };
}

interface WasmBuilt {
	readonly input: WasmInput;
	readonly start: WasmStart;
	readonly facts: EngineFacts;
}

/** The engine built for `program`: what the compiler reads and what an instance starts from. */
export function buildWasmInput(
	program: Program,
	sampleRate: number,
	registry: Registry = getRegistry(),
	running?: readonly KeyedIdentity[],
): WasmBuilt {
	const layered = withProgramSpecs(registry, program);
	return wasmInputOf(prepareProgram(program, layered, sampleRate, running), layered);
}

function wasmInputOf(prepared: PreparedProgram, layered: Registry): WasmBuilt {
	const { program, sampleRate } = prepared;
	const build = new EngineBuild(prepared, layered, undefined);
	const parts = build.finish();
	const taps = (port: string) =>
		Int32Array.from(program.outs, (n) => slotOf(parts.layout, n, port, 0));
	const input: WasmInput = {
		runs: parts.runs,
		modules: program.nodes.map((n) => n.module),
		readsPattern: program.nodes.map((n) => layered.get(n.module)?.reads === "pattern"),
		// A spec with no tick text fails loudly here, before the plans skip it.
		irs: build.nodeSpecs.map(specIR),
		plans: specialiseNodes(parts.runs, build.nodeSpecs, sampleRate),
		lambdas: lambdaSources(program.nodes),
		tapsL: taps("l"),
		tapsR: taps("r"),
		size: parts.layout.size,
		slotCount: parts.bufs.slots.length,
		sampleRate,
		monitor: prepared.monitor
			? monitorPlan(watchList(program, layered), parts.runs, parts.layout)
			: null,
	};
	const facts = engineFacts(
		parts,
		input.readsPattern,
		build.nodeSpecs.map((spec) => spec.writes ?? null),
	);
	return {
		input,
		start: { runs: parts.runs, cur: parts.bufs.cur, slots: parts.bufs.slots },
		facts,
	};
}
