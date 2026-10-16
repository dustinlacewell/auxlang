/**
 * `defmod(name, meta?, setup)` (MANIFESTO §5.1, shape C): lower the setup
 * function into a `LoweredModule` (module/lower/lower-module), compile its
 * state text, and bind the result into a `ModuleSpec` exactly as the written
 * (object) form does (module/bind-module `bindSource`). The source text
 * being evaluated right now (module/source-text) supplies the file the
 * lowering reads same-file helpers and consts from; with none, a setup or
 * tick that needs the file throws (lower/helper-closure) naming the fix.
 */

import { bindSource } from "../module/bind-module";
import { currentSourceText } from "../module/source-text";
import { hydrateFn } from "../module/serialize";
import { fileProgram } from "../module/lower/file-program";
import { lowerModule, type LowerModuleMeta } from "../module/lower/lower-module";
import type { ReadTime } from "../module/front/module/check-module";
import type { ModuleSpec } from "../types";

export function defineModule(
	name: string,
	meta: Record<string, unknown>,
	setup: (...args: never[]) => unknown,
	read: ReadTime,
): ModuleSpec {
	const source = currentSourceText();
	const file = source === null ? null : { text: source.text, program: fileProgram(source) };
	const lowered = lowerModule({
		name,
		meta: meta as LowerModuleMeta,
		setupText: setup.toString(),
		file,
		library: source !== null && source.file.startsWith("lib/"),
	});

	const state = hydrateFn(lowered.stateText, "state", `module '${name}' state`) as (
		sampleRate: number,
		config: Record<string, unknown>,
	) => Record<string, unknown>;

	const spec: ModuleSpec = {
		name: lowered.name,
		category: lowered.category,
		ins: lowered.ins,
		outs: lowered.outs,
		defaultIn: lowered.defaultIn as string,
		...(lowered.defaultOut !== undefined ? { defaultOut: lowered.defaultOut } : {}),
		...(lowered.positional !== undefined ? { positional: lowered.positional } : {}),
		...(lowered.config !== undefined ? { config: lowered.config } : {}),
		...(lowered.policy !== undefined ? { policy: lowered.policy } : {}),
		...(lowered.reads !== undefined ? { reads: lowered.reads } : {}),
		...(lowered.doc !== undefined ? { doc: lowered.doc } : {}),
		writes: lowered.writes,
		state,
		tick: (() => {}) as never,
	};

	return bindSource(spec, lowered.source, read);
}
