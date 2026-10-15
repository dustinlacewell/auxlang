/**
 * The string crossing for eval-defined modules. `serializeSpec` turns a
 * ModuleSpec into plain JSON carrying its source text (`tick`, `helpers`,
 * `state`); `hydrateSpec` rebuilds it on the other side through the same
 * tick build every module uses (tick-build/build-tick). The tick and helpers
 * were checked against the tick subset at eval; `assertClosureFree` fences the
 * rest of the crossing (`state` runs on the other side too), so a closure
 * there fails at compile instead of inside the audio thread.
 */

import type { ModuleSpec, ReduceTickFn, SerializedModuleSpec, TickFn } from "../types";
import { buildTick } from "./tick-build/build-tick";

export function serializeSpec(spec: ModuleSpec): SerializedModuleSpec {
	if (spec.source === undefined) {
		throw new Error(`module '${spec.name}' has no source text and cannot cross to the engine`);
	}
	const helpers = spec.source.helpers;
	return {
		name: spec.name,
		category: spec.category,
		ins: spec.ins,
		outs: spec.outs,
		defaultIn: spec.defaultIn,
		...(spec.defaultOut !== undefined ? { defaultOut: spec.defaultOut } : {}),
		tick: spec.source.tick,
		...(Object.keys(helpers).length > 0 ? { helpers } : {}),
		...(spec.doc !== undefined ? { doc: spec.doc } : {}),
		...(spec.config !== undefined ? { config: spec.config } : {}),
		...(spec.positional !== undefined ? { positional: spec.positional } : {}),
		...(spec.policy !== undefined ? { policy: spec.policy } : {}),
		...(spec.reads !== undefined ? { reads: spec.reads } : {}),
		...(spec.state !== undefined ? { state: spec.state.toString() } : {}),
	};
}

export function hydrateSpec(s: SerializedModuleSpec): ModuleSpec {
	const source = { tick: s.tick, helpers: s.helpers ?? {} };
	const tick = buildTick(source, `module '${s.name}'`);
	const state =
		s.state !== undefined
			? (hydrateFn(s.state, "state", `module '${s.name}' state`) as (
					sampleRate: number,
				) => Record<string, unknown>)
			: undefined;
	const { tick: _t, state: _s, helpers: _h, ...rest } = s;
	return { ...rest, tick, source, ...(state !== undefined ? { state } : {}) };
}

const TRIAL_SAMPLE_RATE = 48000;

/**
 * The safety fence: run a serialized spec through the exact crossing the
 * worklet will perform (hydrate → construct state → one tick). A state
 * closing over patch variables throws HERE, naming the module.
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
			`defmod('${s.name}'): failed a trial run. state is serialized and rebuilt inside the audio engine, so it must be closure-free — no captured patch variables; only its parameter and globals like Math. Original error: ${String(err)}`,
		);
	}
}

/**
 * Compile one function source. Tries the expression form first (arrows, named
 * function expressions); falls back to re-wrapping an object-method shorthand
 * (`state(sr) { ... }` stringifies without a `function` keyword).
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
