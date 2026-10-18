/**
 * Read a set of helpers that call each other by name: parse and resolve each
 * against the set's names, then check each.
 */

import { parsePart } from "../parse/parse-part";
import type { SourceOrigin } from "../../../types";
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
): Map<string, FunctionIR> {
	const helpers = new Map<string, FunctionIR>();
	for (const [name, part] of resolved)
		helpers.set(name, analyseFunction(part, { ...facts, kind: "helper" }));
	return helpers;
}
