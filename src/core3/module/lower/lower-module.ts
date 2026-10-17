/**
 * `lowerModule`: shape-C's entry point. Takes a setup function (as written,
 * optionally found within a parsed file) and its `meta`, and produces
 * everything the old `defineModule`/`bindSource` path needs: the port
 * surface, the internal `ModuleSource` (tick + helper text, with origins
 * recorded from the AST before any rewrite), the internal state text, and
 * the setup-local field names the tick writes (the re-eval carry rule,
 * built elsewhere, reads this list).
 */

import type { ArrowFunctionExpression, FunctionExpression, Identifier, Program } from "acorn";
import type { StateShape } from "../front/state/state-shape";
import type { Category, ModuleSource, PortAnn, SourceOrigin } from "../../types";
import { assertAuthorNames } from "../assert-author-names";
import { parseFunction } from "../front/parse/parse-function";
import { isReference } from "../front/scope/is-reference";
import { resolveBindings } from "../front/scope/resolve-bindings";
import { walk } from "../front/parse/walk";
import { fileScope, type FileScope } from "./file-scope";
import { findSetup } from "./find-setup";
import { helperClosure } from "./helper-closure";
import { applyHelperParamDefaults, helperParamDefaults } from "./helper-param-defaults";
import { inferOuts, type InferredOuts } from "./infer-outs";
import { inferPorts } from "./infer-ports";
import { positionalArgs } from "../positional-args";
import { setupParts } from "./setup-parts";
import { stateText } from "./state-text";
import { tickText } from "./tick-text";
import { tickWrites } from "./tick-writes";

export interface LowerModuleMeta {
	readonly doc?: string;
	readonly cat?: Category;
	readonly args?: readonly string[];
	readonly reduce?: true;
	readonly reads?: "pattern";
	readonly outs?: Readonly<Record<string, PortAnn>>;
	readonly config?: Readonly<Record<string, unknown>>;
	/** The state fields a live monitor watches for note events (ModuleSpec.monitor). */
	readonly monitor?: Readonly<{ row: string; held: string; gate: string }>;
}

export interface LowerModuleFile {
	readonly text: string;
	readonly program: Program;
}

export interface LowerModuleInput {
	readonly name: string;
	readonly meta: LowerModuleMeta;
	readonly setupText: string;
	readonly file: LowerModuleFile | null;
	readonly library: boolean;
}

export interface LoweredModule {
	readonly name: string;
	readonly category: Category;
	readonly doc?: string;
	readonly ins: Readonly<Record<string, PortAnn>>;
	readonly outs: Readonly<Record<string, PortAnn>>;
	readonly defaultIn?: string;
	readonly defaultOut?: string;
	readonly positional?: readonly string[];
	readonly config?: Readonly<Record<string, unknown>>;
	readonly policy?: "map" | "reduce";
	readonly reads?: "pattern";
	readonly monitor?: Readonly<{ row: string; held: string; gate: string }>;
	readonly stateText: string;
	readonly source: ModuleSource;
	readonly writes: readonly string[];
	/** The tick's own AST and setup-local names: `resolveTickWrites` reruns the carry analysis
	 *  once the real field shapes are known (defineModule, after a trial run of `state`). */
	readonly tickNode: ArrowFunctionExpression;
	readonly setupLocals: ReadonlySet<string>;
}

/** Re-resolves a lowered module's `writes` once the real setup-field shapes are known
 *  (defineModule, after a trial run of `state`): an alias through an access that can only
 *  read a number or boolean does not carry the field it reads from. */
export function resolveTickWrites(
	lowered: LoweredModule,
	shapes: ReadonlyMap<string, StateShape>,
): readonly string[] {
	return [...tickWrites(lowered.tickNode, lowered.setupLocals, shapes)];
}

export function lowerModule(input: LowerModuleInput): LoweredModule {
	const what = `module '${input.name}'`;
	assertAuthorNames(input.setupText, `${what} setup`);
	const { setup, fileText } = locateSetup(input);
	const parts = setupParts(setup, what);

	if (parts.params.width && input.meta.reduce !== true) {
		throw new Error(`${what}: setup takes 'width' but meta.reduce is not set`);
	}

	const ports = inferPorts(parts.tick, input.name);
	const outs = inferOuts(parts.tick, input.name);
	const setupLocals = new Set(parts.locals);
	const configKeys = new Set(parts.params.config.map((k) => k.name));
	const scope: FileScope = input.file !== null ? fileScope(input.file.program) : { functions: new Map(), consts: new Map() };

	const tickScopes = resolveBindings(parts.tick as never, new Set());
	const tickFreeNames = new Set(
		[...tickScopes.references.values()].flatMap((r) => (r.k === "free" ? [r.name] : [])),
	);

	const closure = helperClosure(
		parts.tick,
		scope,
		knownTickNames(ports, setupLocals, configKeys),
		input.file === null ? null : fileText,
		input.name,
	);
	for (const name of closure.fileNames) {
		const helperText = closure.helpers[name] as string;
		assertAuthorNames(helperText, `${what} helper '${name}'`);
	}

	const writes = [...tickWrites(parts.tick, setupLocals)];

	const tickBeforeDefaults = tickText(
		parts.tick,
		fileText,
		ports,
		outs,
		setupLocals,
		configKeys,
		scope,
		new Set(Object.keys(closure.helpers)),
		input.name,
	);

	const defaults = helperParamDefaults(closure.fileNames, scope, fileText, what);
	const tick = applyHelperParamDefaults(tickBeforeDefaults, defaults, null);
	const helpers: Record<string, string> = { ...closure.helpers };
	for (const name of closure.fileNames) {
		helpers[name] = applyHelperParamDefaults(helpers[name] as string, defaults, name);
	}

	const state = stateText(parts.statements, fileText, parts.params.config, tickFreeNames, parts.locals, scope);

	const originsFound = originsOf(input, parts.tick, closure, scope);
	const source: ModuleSource =
		originsFound === undefined ? { tick, helpers } : { tick, helpers, origins: originsFound };

	const outsAnn = outsAnnotation(what, outs, input.meta.outs);
	assertGroupWritesDeclared(what, parts.tick, outs.outParam, outsAnn);

	const ins = ports.ins;
	const defaultIn = ports.order[0];
	const defaultOut = outs.outs.includes("out") ? "out" : undefined;

	const config: Record<string, unknown> = { ...(input.meta.config ?? {}) };
	for (const key of parts.params.config) if (key.def !== null) config[key.name] = key.def;
	if (input.meta.reads === "pattern") {
		config.pattern = { op: "silence" };
		config.seed = 1;
		config.lanes = 1;
		config.clocked = 0;
	}
	const positional = positionalArgs(ports.order, input.meta.args, what, configKeys);

	const result: LoweredModule = {
		name: input.name,
		category: input.meta.cat ?? "utils",
		ins,
		outs: outsAnn,
		positional,
		stateText: state.text,
		source,
		writes,
		tickNode: parts.tick,
		setupLocals,
	};
	return {
		...result,
		...(input.meta.doc !== undefined ? { doc: input.meta.doc } : {}),
		...(defaultIn !== undefined ? { defaultIn } : {}),
		...(defaultOut !== undefined ? { defaultOut } : {}),
		...(Object.keys(config).length > 0 ? { config } : {}),
		...(input.meta.reduce === true ? { policy: "reduce" as const } : {}),
		...(input.meta.reads !== undefined ? { reads: input.meta.reads } : {}),
		...(input.meta.monitor !== undefined ? { monitor: input.meta.monitor } : {}),
	};
}

/**
 * Module outputs = the tick's returned keys, then every `meta.outs` key whose
 * annotation is a group and is not itself returned, in `meta.outs` order. A
 * `meta.outs` key that is neither returned nor a group is declared but never
 * produced: a loud error. A returned key that `meta.outs` marks as a group is
 * also a loud error — groups are written through the tick's second param,
 * never `return`.
 */
function outsAnnotation(
	what: string,
	outs: InferredOuts,
	metaOuts: Readonly<Record<string, PortAnn>> | undefined,
): Record<string, PortAnn> {
	const result: Record<string, PortAnn> = {};
	for (const name of outs.outs) {
		const ann = metaOuts?.[name];
		if (ann?.group !== undefined) {
			throw new Error(
				`${what}: output '${name}' is returned, but meta.outs declares it as a group; ` +
					`a group output is written through the tick's second param, not 'return'`,
			);
		}
		result[name] = ann ?? { unit: "sig", def: 0 };
	}
	for (const [name, ann] of Object.entries(metaOuts ?? {})) {
		if (ann.group === undefined) {
			if (!outs.outs.includes(name)) {
				throw new Error(`${what}: output '${name}' is declared in meta.outs but never returned; return it`);
			}
			continue;
		}
		if (!outs.outs.includes(name)) result[name] = ann;
	}
	return result;
}

/** A group member the tick writes through its out param (`o.<name>...`) must be a declared group in `outsAnn`. */
function assertGroupWritesDeclared(
	what: string,
	tick: ArrowFunctionExpression,
	outParam: string | null,
	outsAnn: Readonly<Record<string, PortAnn>>,
): void {
	if (outParam === null) return;
	const scopes = resolveBindings(tick as never, new Set());
	walk(tick.body as never, (node, parent, key) => {
		if (node.type !== "Identifier" || !isReference(parent, key)) return;
		const id = node as Identifier;
		if (id.name !== outParam) return;
		const resolution = scopes.references.get(id);
		if (resolution === undefined || resolution.k !== "binding") return;
		const member = memberNameOf(id, parent);
		if (member === null) return;
		const ann = outsAnn[member];
		if (ann === undefined || ann.group === undefined) {
			throw new Error(
				`${what}: the tick writes '${outParam}.${member}', but '${member}' is not declared as a group ` +
					`output in meta.outs — declare it with 'group(...)' (or 'sigs()'), or return it instead`,
			);
		}
	});
}

function memberNameOf(id: Identifier, parent: unknown): string | null {
	const p = parent as { type?: string; object?: unknown; property?: { type?: string; name?: string } } | null;
	if (p === null || p.type !== "MemberExpression" || p.object !== id) return null;
	if (p.property === undefined || p.property.type !== "Identifier") return null;
	return p.property.name ?? null;
}

function knownTickNames(
	ports: ReturnType<typeof inferPorts>,
	setupLocals: ReadonlySet<string>,
	configKeys: ReadonlySet<string>,
): ReadonlySet<string> {
	return new Set([...ports.bindings.values(), ...setupLocals, ...configKeys, "sr", "width"]);
}

function locateSetup(
	input: LowerModuleInput,
): { readonly setup: ArrowFunctionExpression | FunctionExpression; readonly fileText: string } {
	if (input.file === null) {
		const parsed = parseFunction(input.setupText, `module '${input.name}'`);
		return { setup: parsed.node, fileText: parsed.expression };
	}
	const found = findSetup(input.file.program, input.file.text, input.setupText);
	if (found === null) {
		throw new Error(`module '${input.name}': its defmod call was not found in the given file`);
	}
	return { setup: found.setup, fileText: input.file.text };
}

/** Origins are computed from AST offsets in the ORIGINAL file text, before any rewrite. */
function originsOf(
	input: LowerModuleInput,
	tick: ArrowFunctionExpression,
	closure: ReturnType<typeof helperClosure>,
	scope: FileScope,
): Readonly<Record<string, SourceOrigin>> | undefined {
	if (input.file === null) return undefined;
	const file = input.library ? "lib" : "patch";
	const result: Record<string, SourceOrigin> = {};
	result.tick = { file, line: lineOf(input.file.text, tick.start) };
	for (const name of closure.fileNames) {
		const entry = scope.functions.get(name);
		if (entry !== undefined) result[`helper '${name}'`] = { file, line: lineOf(input.file.text, entry.node.start) };
	}
	return result;
}

function lineOf(text: string, at: number): number {
	let line = 1;
	for (let k = 0; k < at; k++) if (text.charCodeAt(k) === 10) line++;
	return line;
}
