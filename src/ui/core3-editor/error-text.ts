/**
 * The text the error strip shows for a failed run: the language's loud error
 * verbatim, prefixed with the place in the code it points at, when it points
 * somewhere (MANIFESTO §10.1).
 */

import { lineColumn } from "@/core3/source/line-column";
import { errorRange } from "@/core3/source/located-error";

export function errorText(err: unknown, code: string): string {
	const message = err instanceof Error ? err.message : String(err);
	const range = errorRange(err);
	if (range === undefined) return message;
	const { line, column } = lineColumn(code, range.start);
	const what = code.slice(range.start, range.end).split("\n")[0] ?? "";
	return `line ${line}, column ${column}${what === "" ? "" : ` (${what})`}: ${message}`;
}
