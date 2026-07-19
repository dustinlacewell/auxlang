/**
 * The string crossing for eval-defined modules. `serializeSpec` turns a
 * ModuleSpec into plain JSON with `tick`/`state` as source strings;
 * `hydrateSpec` compiles them back (same `new Function` idiom and error style
 * as runtime/lambda's hydrateLambda). `assertClosureFree` is the fence AT this
 * boundary: compile runs it on every spec it serializes into a Program, so a
 * closure-capturing tick fails loudly at compile instead of inside the audio
 * thread. Root-scope specs never cross, so they never pay the fence.
 */

import type { ModuleSpec, ReduceTickFn, SerializedModuleSpec, TickFn } from "../types";

export function serializeSpec(spec: ModuleSpec): SerializedModuleSpec {
	return {
		name: spec.name,
		category: spec.category,
		ins: spec.ins,
		outs: spec.outs,
		defaultIn: spec.defaultIn,
		defaultOut: spec.defaultOut,
		tick: spec.tick.toString(),
		...(spec.doc !== undefined ? { doc: spec.doc } : {}),
		...(spec.config !== undefined ? { config: spec.config } : {}),
		...(spec.positional !== undefined ? { positional: spec.positional } : {}),
		...(spec.policy !== undefined ? { policy: spec.policy } : {}),
		...(spec.state !== undefined ? { state: spec.state.toString() } : {}),
	};
}

export function hydrateSpec(s: SerializedModuleSpec): ModuleSpec {
	const tick = hydrateFn(s.tick, "tick", `module '${s.name}' tick`) as TickFn | ReduceTickFn;
	const state =
		s.state !== undefined
			? (hydrateFn(s.state, "state", `module '${s.name}' state`) as (
					sampleRate: number,
				) => Record<string, unknown>)
			: undefined;
	const { tick: _t, state: _s, ...rest } = s;
	return { ...rest, tick, ...(state !== undefined ? { state } : {}) };
}

const TRIAL_SAMPLE_RATE = 48000;

/**
 * The safety fence: run a serialized spec through the exact crossing the
 * worklet will perform (hydrate via `new Function` → construct state → one
 * tick). A tick or state closing over patch variables throws HERE, naming the
 * module and the closure-free rule.
 */
export function assertClosureFree(s: SerializedModuleSpec): void {
	const hydrated = hydrateSpec(s);
	try {
		const state = hydrated.state?.(TRIAL_SAMPLE_RATE) ?? {};
		const ins: Record<string, number> = {};
		for (const [port, ann] of Object.entries(hydrated.ins)) ins[port] = ann.def ?? 0;
		const outs: Record<string, number> = {};
		const config = hydrated.config ?? {};
		if (hydrated.policy === "reduce") {
			(hydrated.tick as ReduceTickFn)(state, ins, outs, config, TRIAL_SAMPLE_RATE, 1);
		} else {
			(hydrated.tick as TickFn)(state, ins, outs, config, TRIAL_SAMPLE_RATE);
		}
	} catch (err) {
		throw new Error(
			`defmod('${s.name}'): tick failed a trial run. tick and state are serialized and rebuilt inside the audio engine, so they must be closure-free — no captured patch variables; only their parameters and globals like Math. Original error: ${String(err)}`,
		);
	}
}

/**
 * Compile one function source. Tries the expression form first (arrows, named
 * function expressions); falls back to re-wrapping an object-method shorthand
 * (`tick(s, i, o) { ... }` stringifies without a `function` keyword).
 */
function hydrateFn(src: string, key: string, what: string): unknown {
	let fn: unknown;
	try {
		fn = new Function(`"use strict"; return (${src});`)();
	} catch {
		try {
			fn = new Function(`"use strict"; return ({ ${src} })[${JSON.stringify(key)}];`)();
		} catch (err) {
			throw new Error(`${what} source failed to compile: ${String(err)}\n  source: ${src}`);
		}
	}
	if (typeof fn !== "function") {
		throw new Error(`${what} source did not evaluate to a function: ${src}`);
	}
	return fn;
}
