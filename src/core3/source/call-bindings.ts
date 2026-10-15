/**
 * Which literal a port binding came from. A call site records the literals
 * written in its argument list (source-map.ts); a binding takes a literal's
 * site only when the bound value is that literal's value, so a builder that
 * passes its own arguments (not the user's) is never tagged by mistake.
 */

import type { ArgLiteral, CallSite } from "./source-map";

/** The site of positional argument `index`, if it is a literal whose value is `value`. */
export function argLiteralSite(
	call: CallSite | undefined,
	index: number,
	value: unknown,
): number | undefined {
	const arg = call?.args[index];
	if (arg === undefined || arg === null || !("site" in arg)) return undefined;
	return matching(arg, value);
}

/** The site of property `key` in object argument `index`, if it is a literal whose value is `value`. */
export function propLiteralSite(
	call: CallSite | undefined,
	index: number,
	key: string,
	value: unknown,
): number | undefined {
	const arg = call?.args[index];
	if (arg === undefined || arg === null || !("props" in arg)) return undefined;
	const literal = arg.props[key];
	return literal === undefined ? undefined : matching(literal, value);
}

function matching(literal: ArgLiteral, value: unknown): number | undefined {
	return Object.is(literal.value, value) ? literal.site : undefined;
}
