/**
 * `defmod(spec)` — THE module registration function, scope-aware. One
 * ModuleSpec contract everywhere (ins/outs, defaults, optional
 * state/config/policy, tick):
 *
 *   root scope (no eval live)  → the realm registry, the bundle's module table
 *   eval scope (inside runEval) → the current eval's table, scoped to that
 *                                 one patch; nothing leaks between evals
 *
 * Eval-defined specs ship to the worklet inside the compiled Program as
 * source strings — so their `tick` and `state` must be CLOSURE-FREE. That
 * fence lives at the serialization boundary (compile), not here: defining a
 * closure-capturing module is legal until a reachable node actually uses it.
 * Root-scope specs never serialize, so their closures are legal outright.
 *
 * Returns the module's factory in both scopes, so standalone/source-style use
 * works too: `const mysaw = defmod({...}); mysaw(220).out()`.
 */

import { hasModule, registerSpec, validateSpec } from "../module/define";
import type { Category, ModuleSpec, PortAnn } from "../types";
import { currentSpecs, evalCtx } from "./context";
import { moduleFactory } from "./factory";
import { RESERVED_HANDLE_NAMES, assertNoReservedPorts } from "./handle";
import type { Handle } from "./handle-data";
import { RESERVED_SCOPE_NAMES } from "./scope-names";

type Ins<I extends Record<string, PortAnn>> = { [K in keyof I]: number };
type Outs<O extends Record<string, PortAnn>> = { [K in keyof O]: number };
type St = Record<string, unknown>;
type Cfg = Record<string, unknown>;

/** Shared shape; the map/reduce split below exists purely to type `tick` precisely. */
interface DefmodBase<I extends Record<string, PortAnn>, O extends Record<string, PortAnn>> {
	readonly name: string;
	readonly doc?: string;
	readonly category: Category;
	readonly ins: I;
	readonly outs: O;
	readonly config?: Cfg;
	readonly positional?: readonly string[];
	readonly defaultIn: keyof I & string;
	readonly defaultOut: keyof O & string;
	readonly state?: (sampleRate: number) => St;
}

export interface DefmodMapSpec<I extends Record<string, PortAnn>, O extends Record<string, PortAnn>>
	extends DefmodBase<I, O> {
	readonly policy?: "map";
	readonly tick: (s: St, i: Ins<I>, o: Outs<O>, config: Cfg, sampleRate: number) => void;
}

export interface DefmodReduceSpec<
	I extends Record<string, PortAnn>,
	O extends Record<string, PortAnn>,
> extends DefmodBase<I, O> {
	readonly policy: "reduce";
	readonly tick: (
		s: St,
		i: { [K in keyof I]: Float32Array | number },
		o: Outs<O>,
		config: Cfg,
		sampleRate: number,
		width: number,
	) => void;
}

export type DefmodSpec<
	I extends Record<string, PortAnn> = Record<string, PortAnn>,
	O extends Record<string, PortAnn> = Record<string, PortAnn>,
> = DefmodMapSpec<I, O> | DefmodReduceSpec<I, O>;

export function defmod<I extends Record<string, PortAnn>, O extends Record<string, PortAnn>>(
	spec: DefmodSpec<I, O>,
): (...args: unknown[]) => Handle {
	const erased = spec as unknown as ModuleSpec;
	assertWellFormed(erased);
	if (currentSpecs() === null) registerSpec(erased);
	else registerEvalSpec(erased);
	return moduleFactory(erased);
}

/** Eval-scope write: full collision surface (registry, scope helpers, handle names, this eval), then the eval's table. */
function registerEvalSpec(spec: ModuleSpec): void {
	const ctx = evalCtx("defmod()");
	assertNameFree(spec.name, ctx.specs);
	validateSpec(spec);
	assertNoReservedPorts(spec);
	assertJsonConfig(spec.name, spec.config);
	ctx.specs.set(spec.name, spec);
}

/** Shape checks the type system can't enforce for eval'd patch source. */
function assertWellFormed(spec: ModuleSpec): void {
	if (typeof spec !== "object" || spec === null) {
		throw new Error("defmod(spec): spec must be a module spec object");
	}
	if (typeof spec.name !== "string" || spec.name.length === 0) {
		throw new Error("defmod(spec): spec.name must be a non-empty string");
	}
	if (typeof spec.category !== "string" || spec.category.length === 0) {
		throw new Error(`defmod('${spec.name}'): category is required`);
	}
	if (typeof spec.tick !== "function") {
		throw new Error(`defmod('${spec.name}'): tick must be a function`);
	}
	if (spec.state !== undefined && typeof spec.state !== "function") {
		throw new Error(`defmod('${spec.name}'): state must be a function of sampleRate`);
	}
	if (typeof spec.ins !== "object" || spec.ins === null) {
		throw new Error(`defmod('${spec.name}'): ins must be a record of port annotations`);
	}
	if (typeof spec.outs !== "object" || spec.outs === null) {
		throw new Error(`defmod('${spec.name}'): outs must be a record of port annotations`);
	}
}

function assertNameFree(name: string, defined: ReadonlyMap<string, ModuleSpec>): void {
	if (hasModule(name)) {
		throw new Error(`defmod('${name}'): '${name}' collides with a registered module`);
	}
	if (RESERVED_SCOPE_NAMES.has(name)) {
		throw new Error(
			`defmod('${name}'): '${name}' collides with a reserved patch-scope helper ` +
				`(${[...RESERVED_SCOPE_NAMES].join(", ")})`,
		);
	}
	if (RESERVED_HANDLE_NAMES.has(name)) {
		throw new Error(
			`defmod('${name}'): '${name}' collides with a reserved handle name ` +
				`(${[...RESERVED_HANDLE_NAMES].join(", ")})`,
		);
	}
	if (defined.has(name)) {
		throw new Error(`defmod('${name}'): '${name}' is already defined in this patch`);
	}
}

/** Config ships inside the Program as JSON — anything else must fail here, loudly. */
function assertJsonConfig(name: string, config: Record<string, unknown> | undefined): void {
	if (config === undefined) return;
	for (const [key, value] of Object.entries(config)) {
		assertJsonValue(name, `config.${key}`, value);
	}
}

function assertJsonValue(name: string, path: string, value: unknown): void {
	if (value === null || typeof value === "string" || typeof value === "boolean") return;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error(`defmod('${name}'): ${path} is ${value} — config must be JSON-serializable`);
		}
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((v, i) => assertJsonValue(name, `${path}[${i}]`, v));
		return;
	}
	if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			assertJsonValue(name, `${path}.${k}`, v);
		}
		return;
	}
	throw new Error(
		`defmod('${name}'): ${path} is ${typeof value} — config must be JSON-serializable (numbers, strings, booleans, null, arrays, plain objects)`,
	);
}
