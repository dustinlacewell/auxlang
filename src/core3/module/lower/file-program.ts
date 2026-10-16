/**
 * Parse a defmod file's whole source text into an ESTree program, once. A
 * patch body may `return`, as a function body can (`parse-program.ts`).
 * Parsing is pure but re-parsing the same text on every lowering is wasted
 * work, so the result is cached per `SourceText` object.
 */

import { type Program, parse } from "acorn";
import type { SourceText } from "../source-text";

const cache = new WeakMap<SourceText, Program>();

export function fileProgram(source: SourceText): Program {
	const cached = cache.get(source);
	if (cached !== undefined) return cached;
	const program = parse(source.text, {
		ecmaVersion: "latest",
		sourceType: "script",
		allowReturnOutsideFunction: true,
	});
	cache.set(source, program);
	return program;
}
