/**
 * Parse patch code (the BODY of the eval function) into an ESTree program, or
 * report where it fails to parse. A patch body may `return`, as a function
 * body can.
 */

import { type Program, parse } from "acorn";
import type { SourceRange } from "../range";

export type ParsedProgram =
	| { readonly ok: true; readonly program: Program }
	| { readonly ok: false; readonly error: SourceRange };

export function parseProgram(source: string): ParsedProgram {
	try {
		const program = parse(source, {
			ecmaVersion: "latest",
			sourceType: "script",
			allowReturnOutsideFunction: true,
		});
		return { ok: true, program };
	} catch (err) {
		const pos = (err as { pos?: unknown }).pos;
		const at = typeof pos === "number" ? pos : 0;
		return { ok: false, error: { start: at, end: Math.min(at + 1, source.length) } };
	}
}
