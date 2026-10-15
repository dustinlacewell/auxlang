/**
 * A name read in a pasted function: a local or plain parameter becomes its
 * generated name; `undefined`, `NaN` and `Infinity` are the constants. Any
 * other name — an object parameter used bare, a helper not called, a free
 * variable — is refused.
 */

import { refuse } from "./not-pasteable";
import type { PasteContext } from "./paste-context";

export function printName(name: string, ctx: PasteContext): string {
	const local = ctx.locals.get(name);
	if (local !== undefined) return local;
	if (name === "undefined") return "(void 0)";
	if (name === "NaN" || name === "Infinity") return name;
	return refuse(`'${name}' is used outside a field read`);
}
