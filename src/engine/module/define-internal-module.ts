/**
 * `defineInternalModule(spec)` — the backend's own entry point for an INTERNAL
 * spec (ins/outs, defaults, optional state/config/policy, tick + helpers as
 * closures): used by the lowering path (patch/define-module.ts, every
 * `writes` already resolved there) and by the test fixture
 * (tests/engine/fixtures/internal-module.ts), reaching it from patch text.
 * Not part of the patch language.
 *
 * `writes` is required on every spec that reaches here: the re-eval carry
 * rule (module/front/state/carry-fields.ts) reads it directly, with no
 * whole-shape fallback.
 */

import { type WrittenSpec, bindModule } from "./bind-module";
import { type ReadTime } from "./front/module/check-module";
import { registerSpec, validateSpec } from "./define";
import type { Category, ModuleSpec, PortAnn } from "../types";
import { currentSpecs, evalCtx } from "../patch/context";
import { assertNoReservedPorts } from "../patch/handle";
import { assertEvalNameFree, assertRootNameFree } from "../patch/name-free";

type Ins<I extends Record<string, PortAnn>> = { [K in keyof I]: number };
type Outs<O extends Record<string, PortAnn>> = { [K in keyof O]: number };
type St = Record<string, unknown>;
type Cfg = Record<string, unknown>;

/** Shared shape of the internal spec's non-tick fields; `writes` is required, unlike the general `ModuleSpec`. */
interface InternalModuleBase<I extends Record<string, PortAnn>, O extends Record<string, PortAnn>> {
	readonly name: string;
	readonly doc?: string;
	readonly category: Category;
	readonly ins: I;
	readonly outs: O;
	readonly config?: Cfg;
	readonly positional?: readonly string[];
	readonly defaultIn: keyof I & string;
	readonly defaultOut?: keyof O & string;
	readonly state?: (sampleRate: number) => St;
	readonly reads?: "pattern";
	readonly helpers?: Readonly<Record<string, (...args: never[]) => unknown>>;
	readonly monitor?: Readonly<{ row: string; held: string; gate: string }>;
	readonly writes: readonly string[];
}

export interface InternalModuleMapSpec<I extends Record<string, PortAnn>, O extends Record<string, PortAnn>>
	extends InternalModuleBase<I, O> {
	readonly policy?: "map";
	readonly tick: (s: St, i: Ins<I>, o: Outs<O>, config: Cfg, sampleRate: number) => void;
}

export interface InternalModuleReduceSpec<
	I extends Record<string, PortAnn>,
	O extends Record<string, PortAnn>,
> extends InternalModuleBase<I, O> {
	readonly policy: "reduce";
	readonly tick: (
		s: St,
		i: { [K in keyof I]: Float64Array | number },
		o: Outs<O>,
		config: Cfg,
		sampleRate: number,
		width: number,
	) => void;
}

export type InternalModuleSpec<
	I extends Record<string, PortAnn> = Record<string, PortAnn>,
	O extends Record<string, PortAnn> = Record<string, PortAnn>,
> = InternalModuleMapSpec<I, O> | InternalModuleReduceSpec<I, O>;

/** The same two shapes, `writes` optional: the test fixture defaults it before calling in. */
export type InternalModuleSpecWithoutWrites<
	I extends Record<string, PortAnn> = Record<string, PortAnn>,
	O extends Record<string, PortAnn> = Record<string, PortAnn>,
> =
	| (Omit<InternalModuleMapSpec<I, O>, "writes"> & { readonly writes?: readonly string[] })
	| (Omit<InternalModuleReduceSpec<I, O>, "writes"> & { readonly writes?: readonly string[] });

export function defineInternalModule<
	I extends Record<string, PortAnn>,
	O extends Record<string, PortAnn>,
>(spec: InternalModuleSpec<I, O>): ModuleSpec {
	const written = spec as unknown as WrittenSpec;
	return currentSpecs() === null ? registerRootSpec(written) : registerEvalSpec(written);
}

/** Root-scope write (the library, at import): contract checks, the tick build, the realm registry; the tick is read on first use. */
function registerRootSpec(written: WrittenSpec): ModuleSpec {
	validateSpec(written);
	return registerRoot(written.name, (read) => bindModule(written, read));
}

/** Eval-scope write: full collision surface (registry, scope helpers, handle names, this eval), then the eval's table. */
function registerEvalSpec(written: WrittenSpec): ModuleSpec {
	validateSpec(written);
	assertNoReservedPorts(written);
	assertJsonConfig(written.name, written.config);
	return registerEval(written.name, (read) => bindModule(written, read));
}

/** Root-scope write, shared by both `defmod` forms: contract checks on the name, bind, the realm registry. */
function registerRoot(name: string, bind: (read: ReadTime) => ModuleSpec): ModuleSpec {
	assertRootNameFree(name);
	const bound = bind("first use");
	validateSpec(bound);
	registerSpec(bound);
	return bound;
}

/** Eval-scope write, shared by both `defmod` forms: the full collision surface, bind, then this eval's table. */
function registerEval(name: string, bind: (read: ReadTime) => ModuleSpec): ModuleSpec {
	const ctx = evalCtx("defmod()");
	assertEvalNameFree(name);
	const bound = bind("now");
	validateSpec(bound);
	assertNoReservedPorts(bound);
	assertJsonConfig(bound.name, bound.config);
	ctx.specs.set(bound.name, bound);
	return bound;
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
