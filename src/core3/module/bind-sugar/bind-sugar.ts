/**
 * Lift a function's compiler shortcuts (MANIFESTO §5, card "Compiler
 * shortcuts to lift") into the forms the tick subset already accepts, before
 * `bindModuleMath` runs. Each lift is a pure text-to-text pass; edits stay on
 * their lines, so a later error still names the author's own line.
 */

import { liftArrayMethods } from "./lift-array-methods";
import { liftDestructuring } from "./lift-destructuring";
import { liftExponentAssign } from "./lift-exponent-assign";
import { liftForOf } from "./lift-for-of";
import { liftLetNoValue } from "./lift-let-no-value";
import { liftOptionalChaining } from "./lift-optional-chaining";
import { liftStringMember } from "./lift-string-member";

export function bindSugar(src: string, what: string): string {
	let text = src;
	text = liftExponentAssign(text, what);
	text = liftStringMember(text, what);
	text = liftOptionalChaining(text, what);
	text = liftLetNoValue(text, what);
	text = liftDestructuring(text, what);
	text = liftArrayMethods(text, what);
	text = liftForOf(text, what);
	return text;
}
