/**
 * `lowerModule`: shape-C's entry point. Takes a setup function (as written,
 * optionally found within a parsed file) and its `meta`, and produces
 * everything the old `defineModule`/`bindSource` path needs: the port
 * surface, the internal `ModuleSource` (tick + helper text, with origins
 * recorded from the AST before any rewrite), the internal state text, and
 * the setup-local field names the tick writes (the re-eval carry rule,
 * built elsewhere, reads this list).
 */

import type { ArrowFunctionExpression, FunctionExpression, Program } from "acorn";
import type { StateShape } from "../front/state/state-shape";
import type { Category, ModuleSource, PortAnn, SourceOrigin } from "../../types";
import { assertAuthorNames } from "../assert-author-names";
import { parseFunction } from "../front/parse/parse-function";
import { resolveBindings } from "../front/scope/resolve-bindings";
import { fileScope, type FileScope } from "./file-scope";
import { findSetup } from "./find-setup";
import { helperClosure } from "./helper-closure";
import { inferOuts } from "./infer-outs";
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

	const tick = tickText(
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

	const state = stateText(parts.statements, fileText, parts.params.config, tickFreeNames, parts.locals, scope);

	const originsFound = originsOf(input, parts.tick, closure, scope);
	const source: ModuleSource =
		originsFound === undefined ? { tick, helpers: closure.helpers } : { tick, helpers: closure.helpers, origins: originsFound };

	const outsAnn: Record<string, PortAnn> = {};
	for (const name of outs.outs) outsAnn[name] = input.meta.outs?.[name] ?? { unit: "sig", def: 0 };

	const ins = ports.ins;
	const defaultIn = ports.order[0];
	const positional = positionalArgs(ports.order, input.meta.args, what);
	const defaultOut = outs.outs.includes("out") ? "out" : undefined;

	const config: Record<string, unknown> = { ...(input.meta.config ?? {}) };
	for (const key of parts.params.config) if (key.def !== null) config[key.name] = key.def;
	if (input.meta.reads === "pattern") {
		config.pattern = { op: "silence" };
		config.seed = 1;
		config.lanes = 1;
		config.clocked = 0;
	}

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
	};
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
