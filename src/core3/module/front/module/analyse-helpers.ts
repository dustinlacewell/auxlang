/**
 * Read a set of helpers that call each other by name: parse and resolve each
 * against the set's names, then check each, with the parameter that takes
 * the tick's state record where one does (helper-state-params.ts).
 */

import { parsePart } from "@/core3/module/front/parse/parse-part";
import type { Binding } from "@/core3/module/front/scope/binding";
import type { SourceOrigin } from "@/core3/types";
import { type FunctionFacts, analyseFunction, resolvePart } from "./analyse-function";
import type { FunctionIR, ResolvedPart } from "./module-ir";

export function resolveHelpers(
	texts: Readonly<Record<string, string>>,
	owner: string,
	names: ReadonlySet<string>,
	origins: Readonly<Record<string, SourceOrigin>> = {},
): Map<string, ResolvedPart> {
	const resolved = new Map<string, ResolvedPart>();
	for (const [name, src] of Object.entries(texts)) {
		const part = `helper '${name}'`;
		resolved.set(name, resolvePart(parsePart({ owner, part, src, origin: origins[part] }), names));
	}
	return resolved;
}

export function analyseHelpers(
	resolved: ReadonlyMap<string, ResolvedPart>,
	facts: Omit<FunctionFacts, "kind">,
	stateParams: ReadonlyMap<string, Binding>,
): Map<string, FunctionIR> {
	const helpers = new Map<string, FunctionIR>();
	for (const [name, part] of resolved)
		helpers.set(name, analyseFunction(part, { ...facts, kind: "helper" }, stateParams.get(name)));
	return helpers;
}
