/**
 * `defmod(spec)` — THE module registration function, scope-aware. One
 * ModuleSpec contract everywhere (ins/outs, defaults, optional
 * state/config/policy, tick):
 *
 *   root scope (no eval live)  → the realm registry, the bundle's module table
 *   eval scope (inside runEval) → the current eval's table, scoped to that
 *                                 one patch; nothing leaks between evals
 *
 * In both scopes the tick and its `helpers` are checked against the tick
 * subset (MANIFESTO §5.1) and the tick is rebuilt from its source text with
 * `Math.random`, `hashRandom` and the helpers bound (module/bind-module).
 * Built-in modules arrive here the same way: their library files are plain
 * `defmod` source (modules/lib). Eval-defined specs ship to the worklet as
 * source strings; their `state` is fenced at that crossing (compile).
 *
 * Returns the module's factory in both scopes, so standalone/source-style use
 * works too: `const mysaw = defmod({...}); mysaw(220).out()`.
 */

import { type WrittenSpec, bindModule } from "../module/bind-module";
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
	/** Named functions the tick may call, under the same rules as the tick. */
	readonly helpers?: Readonly<Record<string, (...args: never[]) => unknown>>;
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
	const written = spec as unknown as WrittenSpec;
	assertWellFormed(written);
	const bound = currentSpecs() === null ? registerRootSpec(written) : registerEvalSpec(written);
	return moduleFactory(bound);
}

/** Root-scope write: contract checks, then the tick check and build, then the realm registry. */
function registerRootSpec(written: WrittenSpec): ModuleSpec {
	validateSpec(written);
	const bound = bindModule(written);
	registerSpec(bound);
	return bound;
}

/** Eval-scope write: full collision surface (registry, scope helpers, handle names, this eval), then the eval's table. */
function registerEvalSpec(written: WrittenSpec): ModuleSpec {
	const ctx = evalCtx("defmod()");
	assertNameFree(written.name, ctx.specs);
	validateSpec(written);
	assertNoReservedPorts(written);
	assertJsonConfig(written.name, written.config);
	const bound = bindModule(written);
	ctx.specs.set(bound.name, bound);
	return bound;
}

/** Shape checks the type system can't enforce for eval'd patch source. */
function assertWellFormed(spec: WrittenSpec): void {
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
	assertHelpers(spec);
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function assertHelpers(spec: WrittenSpec): void {
	if (spec.helpers === undefined) return;
	if (typeof spec.helpers !== "object" || spec.helpers === null) {
		throw new Error(`defmod('${spec.name}'): helpers must be a record of named functions`);
	}
	for (const [name, fn] of Object.entries(spec.helpers)) {
		if (!IDENTIFIER.test(name) || name.startsWith("__")) {
			throw new Error(`defmod('${spec.name}'): helper name '${name}' must be a plain identifier`);
		}
		if (typeof fn !== "function") {
			throw new Error(`defmod('${spec.name}'): helper '${name}' must be a function`);
		}
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
