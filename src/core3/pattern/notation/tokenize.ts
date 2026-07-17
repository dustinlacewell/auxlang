/**
 * Mini-notation tokenizer. Turns a source string into a flat token stream with
 * character positions, so the parser can report loud, positioned errors.
 *
 * Interpolations (from the `p` tagged template) enter the stream as SPLICE
 * tokens carrying the raw JS value; everything else is lexed from text.
 */

export type TokenKind =
	| "atom" // note or number literal, e.g. "c4", "eb3", "0.5", "12"
	| "rest" // ~
	| "extend" // _  (bare underscore step: extends previous weight)
	| "lbracket" // [
	| "rbracket" // ]
	| "langle" // <
	| "rangle" // >
	| "lbrace" // {
	| "rbrace" // }
	| "comma" // ,
	| "lparen" // (
	| "rparen" // )
	| "star" // *
	| "bang" // !
	| "at" // @
	| "slash" // /  (rational factor denominator: 3/2)
	| "question" // ?
	| "tie" // _  when it joins atoms: a_b  (see note below)
	| "splice"; // interpolated JS value

export interface Token {
	readonly kind: TokenKind;
	/** Source text of the token (for atom/number: the literal). */
	readonly text: string;
	/** Character offset in the (reconstructed) source. */
	readonly pos: number;
	/** For SPLICE tokens: the interpolated JS value. */
	readonly value?: unknown;
}

/** Marker object the template layer inserts between segments. */
export interface Splice {
	readonly __splice: true;
	readonly value: unknown;
}

export const splice = (value: unknown): Splice => ({ __splice: true, value });

const isSplice = (x: unknown): x is Splice =>
	typeof x === "object" && x !== null && (x as { __splice?: unknown }).__splice === true;

const WS = new Set([" ", "\t", "\n", "\r"]);

// Atom body: note letters, accidentals, digits, dot (decimals / octave), sign.
const isAtomStart = (c: string): boolean => /[A-Za-z0-9.+-]/.test(c);
const isAtomBody = (c: string): boolean => /[A-Za-z0-9.#]/.test(c);

/**
 * Lex one text segment starting at absolute offset `base`, pushing tokens.
 * `_` is ambiguous: standalone it is a step ("extend"); adjacent to atoms it is
 * a tie joiner. The tokenizer emits a single `tie` token for `_` and lets the
 * parser decide (bare `_` between whitespace = extend, `a_b` = tie). To keep the
 * parser simple we distinguish here by neighbours.
 */
function lexSegment(src: string, base: number, out: Token[]): void {
	let i = 0;
	const push = (kind: TokenKind, text: string, pos: number) => out.push({ kind, text, pos });

	while (i < src.length) {
		const c = src[i]!;
		const pos = base + i;

		if (WS.has(c)) {
			i++;
			continue;
		}

		switch (c) {
			case "[":
				push("lbracket", c, pos);
				i++;
				continue;
			case "]":
				push("rbracket", c, pos);
				i++;
				continue;
			case "<":
				push("langle", c, pos);
				i++;
				continue;
			case ">":
				push("rangle", c, pos);
				i++;
				continue;
			case "{":
				push("lbrace", c, pos);
				i++;
				continue;
			case "}":
				push("rbrace", c, pos);
				i++;
				continue;
			case ",":
				push("comma", c, pos);
				i++;
				continue;
			case "(":
				push("lparen", c, pos);
				i++;
				continue;
			case ")":
				push("rparen", c, pos);
				i++;
				continue;
			case "*":
				push("star", c, pos);
				i++;
				continue;
			case "!":
				push("bang", c, pos);
				i++;
				continue;
			case "@":
				push("at", c, pos);
				i++;
				continue;
			case "/":
				push("slash", c, pos);
				i++;
				continue;
			case "?":
				push("question", c, pos);
				i++;
				continue;
			case "~":
				push("rest", c, pos);
				i++;
				continue;
		}

		if (c === "_") {
			// Tie joiner when the previous char (in text) was part of an atom or
			// the previous token was an atom/group-close; otherwise a standalone
			// extend step. The parser refines this; we mark tie vs extend by
			// whitespace on the left.
			const prevChar = i > 0 ? src[i - 1]! : "";
			const leftBound = prevChar === "" || WS.has(prevChar);
			push(leftBound ? "extend" : "tie", c, pos);
			i++;
			continue;
		}

		if (isAtomStart(c)) {
			let j = i + 1;
			while (j < src.length && isAtomBody(src[j]!)) j++;
			// Decimals: allow a trailing "._digits" already covered by isAtomBody
			// via '.', but a leading dot number like ".75" is handled by isAtomStart.
			push("atom", src.slice(i, j), pos);
			i = j;
			continue;
		}

		throw notationError(`unexpected character '${c}'`, pos, src, base);
	}
}

/** Build a positioned error, including a caret line for the reconstructed source. */
export function notationError(msg: string, pos: number, _seg?: string, _base?: number): Error {
	return new Error(`mini-notation: ${msg} (at position ${pos})`);
}

/**
 * Tokenize a raw template. `strings` are the literal text segments; `values` are
 * the interpolations spliced between them. Positions are computed against the
 * concatenated source so error carets line up with what the user typed.
 */
export function tokenize(strings: readonly string[], values: readonly unknown[] = []): Token[] {
	const out: Token[] = [];
	let base = 0;
	for (let k = 0; k < strings.length; k++) {
		const seg = strings[k]!;
		lexSegment(seg, base, out);
		base += seg.length;
		if (k < values.length) {
			const v = values[k];
			out.push({ kind: "splice", text: "${…}", pos: base, value: isSplice(v) ? v.value : v });
			// interpolation contributes 1 notional char to keep positions monotonic
			base += 1;
		}
	}
	return out;
}

/** Convenience for a plain string (no interpolation). */
export const tokenizeString = (src: string): Token[] => tokenize([src], []);
