/**
 * The helpers a tick reaches, transitively: same-file top-level functions it
 * calls, directly or through another same-file function it calls, plus the
 * library functions (`library-functions.ts`) any of them call by name. A
 * free name in the tick or a reached helper that is none of these — not a
 * port, a setup local, a config key, `sr`, `width`, `Math`, an allowed
 * global, a file function, a file const, or a library name — is a loud
 * error naming it. Scope decides what counts as free (`resolve-bindings`):
 * a tick local never reaches here even when it shares a name with a port.
 */

import type { ArrowFunctionExpression, FunctionDeclaration } from "acorn";
import type { FunctionNode } from "../front/parse/parse-function";
import { resolveBindings } from "../front/scope/resolve-bindings";
import { LIBRARY_FUNCTIONS } from "../library-functions";
import type { FileScope } from "./file-scope";

const ALLOWED_FREE = new Set(["Math", "undefined", "NaN", "Infinity"]);

export interface HelperClosure {
	/** Reached same-file and library functions, in today's `ModuleSource.helpers` shape: name -> text. */
	readonly helpers: Readonly<Record<string, string>>;
	/** Same-file helper names reached. */
	readonly fileNames: readonly string[];
}

/** `fileText` lets same-file helper declarations be sliced out as their own text. */
export function helperClosure(
	tick: ArrowFunctionExpression,
	scope: FileScope,
	knownNames: ReadonlySet<string>,
	fileText: string | null,
	moduleName: string,
): HelperClosure {
	const what = `module '${moduleName}'`;
	const fileNames = new Set<string>();
	const libraryNames = new Set<string>();
	const seenFile = new Set<string>();
	const queue: FunctionNode[] = [tick];

	while (queue.length > 0) {
		const fn = queue.shift() as FunctionNode;
		const scopes = resolveBindings(fn, new Set());
		for (const resolution of scopes.references.values()) {
			if (resolution.k !== "free") continue;
			const name = resolution.name;
			if (knownNames.has(name) || ALLOWED_FREE.has(name)) continue;
			if (scope.functions.has(name)) {
				fileNames.add(name);
				if (!seenFile.has(name)) {
					seenFile.add(name);
					const entry = scope.functions.get(name) as { node: FunctionDeclaration };
					queue.push(entry.node as unknown as FunctionNode);
				}
				continue;
			}
			if (scope.consts.has(name)) continue; // inlined by `tick-text`/`state-text`, not a helper
			if (name in LIBRARY_FUNCTIONS) {
				libraryNames.add(name);
				continue;
			}
			throw new Error(
				fileText === null
					? `${what}: '${name}' is not a port, state, config, or library name. If it is meant to be ` +
						`a same-file helper or const, evaluate the patch text through evalPatch so the ` +
						`lowering can see the file.`
					: `${what}: '${name}' is not a port, state, config, file function/const, or library name`,
			);
		}
	}

	if (fileNames.size > 0 && fileText === null) {
		throw new Error(
			`${what}: reaches a same-file helper, but no file text was given to slice it from. ` +
				`Evaluate the patch text through evalPatch so the file is available to the lowering.`,
		);
	}

	const helpers: Record<string, string> = {};
	for (const name of fileNames) {
		const entry = scope.functions.get(name) as { node: FunctionDeclaration };
		helpers[name] = (fileText as string).slice(entry.node.start, entry.node.end);
	}
	for (const name of libraryNames) {
		helpers[name] = (LIBRARY_FUNCTIONS[name] as (...args: never[]) => unknown).toString();
	}
	return { helpers, fileNames: [...fileNames] };
}
