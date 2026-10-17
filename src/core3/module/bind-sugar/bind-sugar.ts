/**
 * Lift a function's compiler shortcuts (MANIFESTO §5, card "Compiler
 * shortcuts to lift") into the forms the tick subset already accepts, before
 * `bindModuleMath` runs. Each lift is a pure text-to-text pass; edits stay on
 * their lines, so a later error still names the author's own line.
 */

import { liftExponentAssign } from "./lift-exponent-assign";
import { liftOptionalChaining } from "./lift-optional-chaining";
import { liftStringMember } from "./lift-string-member";

export function bindSugar(src: string, what: string): string {
	let text = src;
	text = liftExponentAssign(text, what);
	text = liftStringMember(text, what);
	text = liftOptionalChaining(text, what);
	return text;
}
