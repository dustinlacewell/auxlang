/**
 * `p` — the mini-notation tagged template.
 *
 *   p`c4 [e4 g4] <a4 b4>`
 *   p`${hook} ${hook.rev().add(12)} ~ ${hook.fast(2)}`
 *
 * Interpolations splice by value: a `P`/`Pat` becomes a subpattern, a number a
 * `pure`, a note/mini-notation string is parsed, an array becomes a fastcat
 * group. Splicing runs through the tokenizer as a dedicated SPLICE token so
 * positions stay aligned with the literal text.
 */

import { toP } from "../pat-class";
import type { P } from "../pat-class";
import { parseNotation } from "./parse";

export function p(strings: TemplateStringsArray, ...values: unknown[]): P {
	return toP(parseNotation(strings, values));
}
