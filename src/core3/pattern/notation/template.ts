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

import { activeTemplateSource } from "../../source/active-source";
import { P } from "../pat-class";
import { parseNotationWithPalette } from "./parse";

/**
 * In a patch under eval, the template's tokens carry their sites (MANIFESTO
 * §10.1). Splicing a signal makes a palette P (pattern/palette): every leaf
 * becomes a palette index — see parse.ts's PaletteCollector.
 */
export function p(strings: TemplateStringsArray, ...values: unknown[]): P {
	const { pat, palette } = parseNotationWithPalette(strings, values, activeTemplateSource(strings.length));
	return new P(pat, palette);
}
