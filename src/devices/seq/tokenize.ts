/**
 * Tokenizer for mini-notation patterns.
 *
 * Converts a pattern string into a sequence of tokens.
 *
 * Supported tokens:
 * - Notes: c3, c#4, db2, etc.
 * - Rest: ~
 * - Groups: [ ]
 * - Alternation: < >
 * - Euclidean: ( ) ,
 * - Multiply: *
 * - Replicate: !
 * - Elongate: @
 * - Numbers: 1, 2, 3, etc.
 */

import type { Token, TokenType } from "./types";

const NOTE_PATTERN = /^[a-gA-G][#b]?[0-9]?/;
const NUMBER_PATTERN = /^[0-9]+/;

/**
 * Tokenize a mini-notation pattern string.
 *
 * @param input - Pattern string like "c3 e3 [g3 b3] ~"
 * @returns Array of tokens
 *
 * @example
 * tokenize("c3*2 <e3 g3>")
 * // [{ type: "NOTE", value: "c3", position: 0 },
 * //  { type: "MULTIPLY", value: "*", position: 2 },
 * //  { type: "NUMBER", value: "2", position: 3 },
 * //  { type: "LANGLE", value: "<", position: 5 },
 * //  ... ]
 */
export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let position = 0;

	while (position < input.length) {
		const char = input[position];

		// Skip whitespace
		if (char === " " || char === "\t" || char === "\n") {
			position++;
			continue;
		}

		// Single-character tokens
		if (char === "[") {
			tokens.push(makeToken("LBRACKET", "[", position));
			position++;
			continue;
		}

		if (char === "]") {
			tokens.push(makeToken("RBRACKET", "]", position));
			position++;
			continue;
		}

		if (char === "<") {
			tokens.push(makeToken("LANGLE", "<", position));
			position++;
			continue;
		}

		if (char === ">") {
			tokens.push(makeToken("RANGLE", ">", position));
			position++;
			continue;
		}

		if (char === "(") {
			tokens.push(makeToken("LPAREN", "(", position));
			position++;
			continue;
		}

		if (char === ")") {
			tokens.push(makeToken("RPAREN", ")", position));
			position++;
			continue;
		}

		if (char === ",") {
			tokens.push(makeToken("COMMA", ",", position));
			position++;
			continue;
		}

		if (char === "~") {
			tokens.push(makeToken("REST", "~", position));
			position++;
			continue;
		}

		if (char === "*") {
			tokens.push(makeToken("MULTIPLY", "*", position));
			position++;
			continue;
		}

		if (char === "!") {
			tokens.push(makeToken("REPLICATE", "!", position));
			position++;
			continue;
		}

		if (char === "@") {
			tokens.push(makeToken("ELONGATE", "@", position));
			position++;
			continue;
		}

		if (char === "_") {
			tokens.push(makeToken("GLIDE", "_", position));
			position++;
			continue;
		}

		// Multi-character tokens
		const remaining = input.slice(position);

		// Note (check first - notes start with letters)
		const noteMatch = remaining.match(NOTE_PATTERN);
		if (noteMatch?.[0]) {
			const value = noteMatch[0];
			tokens.push(makeToken("NOTE", value, position));
			position += value.length;
			continue;
		}

		// Number (for operators like *2, @3, (3,8))
		const numberMatch = remaining.match(NUMBER_PATTERN);
		if (numberMatch?.[0]) {
			const value = numberMatch[0];
			tokens.push(makeToken("NUMBER", value, position));
			position += value.length;
			continue;
		}

		// Unknown character
		throw new Error(
			`Unexpected character '${char}' at position ${position}`,
		);
	}

	tokens.push(makeToken("EOF", "", position));
	return tokens;
}

function makeToken(type: TokenType, value: string, position: number): Token {
	return { type, value, position };
}
