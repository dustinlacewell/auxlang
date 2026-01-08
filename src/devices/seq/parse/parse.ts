/**
 * Parser for mini-notation patterns.
 *
 * Converts tokens into a beat-structured pattern where each beat
 * corresponds to one clock trigger.
 *
 * Grammar (informal):
 *   pattern     = element*
 *   element     = base modifier* (GLIDE element | COMMA element)?
 *   base        = NOTE | REST | group | alternate
 *   group       = '[' element* ']'
 *   alternate   = '<' element* '>'
 *   modifier    = REPLICATE num | ELONGATE num | EUCLIDEAN | MULTIPLY num | MAYBE
 *
 * Supported syntax:
 * - Notes: c3, c#4, db2
 * - Rests: ~
 * - Groups: [c3 e3] - subdivide within one beat
 * - Alternation: <c3 e3> - cycle through options
 * - Multiply: c3*2 - repeat within same beat
 * - Replicate: c3!2 - repeat as separate beats
 * - Elongate: c3@2 - sustain across multiple beats (tied)
 * - Euclidean: c3(3,8) - spread 3 hits over 8 beats
 * - Maybe: c3? - 50% chance to play (becomes rest if not)
 * - Glide: c3_e3 - tie notes together (legato)
 * - Stack: c4,e4,g4 - play notes simultaneously (chord)
 */

import { tokenize } from "../tokenize";
import type { Pattern } from "../types";
import { applyElongate } from "./apply-elongate";
import { applyEuclidean } from "./apply-euclidean";
import { applyGlide } from "./apply-glide";
import { applyMaybe } from "./apply-maybe";
import { applyMultiply, applyMultiplyWithAlternation } from "./apply-multiply";
import { applyReplicate } from "./apply-replicate";
import { applyStack } from "./apply-stack";
import { parseAlternate } from "./parse-alternate";
import { parseGroup } from "./parse-group";
import { parseNote } from "./parse-note";
import { TokenStream } from "./token-stream";
import type { ParseResult } from "./types";

/**
 * Parse a mini-notation pattern string into a beat-structured Pattern.
 *
 * @param input - Pattern string like "c3 e3 [g3 b3] ~"
 * @returns Pattern as array of beats (each beat = one clock trigger)
 */
export function parse(input: string): Pattern {
	const tokens = tokenize(input);
	const stream = new TokenStream(tokens);
	const beats = parseTopLevel(stream);

	if (!stream.isAtEnd()) {
		const token = stream.current();
		throw new Error(
			`Unexpected token '${token.type}' at position ${token.position}`,
		);
	}

	return beats;
}

/**
 * Parse top-level sequence - each element becomes one or more beats.
 */
function parseTopLevel(stream: TokenStream): Pattern {
	const beats: Pattern = [];

	while (!stream.isAtEnd()) {
		const result = parseElementWithModifiers(stream);
		beats.push(...result.beats);
	}

	return beats;
}

/**
 * Parse an element with any postfix modifiers, then check for glide/stack.
 *
 * Precedence (tightest to loosest):
 * 1. Postfix modifiers: *, !, @, ()
 * 2. Stack operator: ,
 * 3. Glide operator: _
 * 4. Sequence (space)
 */
function parseElementWithModifiers(stream: TokenStream): ParseResult {
	const baseResult = parseElement(stream);
	const modifiedResult = applyPostfixModifier(stream, baseResult);

	// Stack binds tighter than glide
	if (stream.check("COMMA")) {
		stream.expect("COMMA");
		const rightResult = parseElementWithModifiers(stream);
		return applyStack(modifiedResult, rightResult);
	}

	// Glide binds looser than stack, tighter than sequence
	if (stream.check("GLIDE")) {
		stream.expect("GLIDE");
		const rightResult = parseElementWithModifiers(stream);
		return applyGlide(modifiedResult, rightResult);
	}

	return modifiedResult;
}

/**
 * Apply postfix modifiers if present.
 * ? (maybe) can follow other modifiers, so check for it after.
 */
function applyPostfixModifier(
	stream: TokenStream,
	result: ParseResult,
): ParseResult {
	let modified = result;

	if (stream.check("REPLICATE")) {
		stream.expect("REPLICATE");
		modified = applyReplicate(modified, stream.parseNumber());
	} else if (stream.check("ELONGATE")) {
		stream.expect("ELONGATE");
		modified = applyElongate(modified, stream.parseNumber());
	} else if (stream.check("LPAREN")) {
		stream.expect("LPAREN");
		const hits = stream.parseNumber();
		stream.expect("COMMA");
		const totalSteps = stream.parseNumber();
		stream.expect("RPAREN");
		modified = applyEuclidean(modified, hits, totalSteps);
	} else if (stream.check("MULTIPLY")) {
		stream.expect("MULTIPLY");
		if (stream.check("LANGLE")) {
			modified = parseMultiplyWithAlternation(stream, modified);
		} else {
			modified = applyMultiply(modified, stream.parseNumber());
		}
	}

	// ? can follow other modifiers (c4*2? means "multiply then maybe")
	// Token value contains probability: "0.5" for ?, "0.2" for ?0.2, etc.
	if (stream.check("MAYBE")) {
		const token = stream.expect("MAYBE");
		const prob = Number.parseFloat(token.value);
		modified = applyMaybe(modified, prob);
	}

	return modified;
}

/**
 * Parse *<1 2 3> - multiply with alternating counts.
 */
function parseMultiplyWithAlternation(
	stream: TokenStream,
	result: ParseResult,
): ParseResult {
	stream.expect("LANGLE");

	const counts: number[] = [];
	while (!stream.check("RANGLE") && !stream.isAtEnd()) {
		counts.push(stream.parseNumber());
	}
	stream.expect("RANGLE");

	return applyMultiplyWithAlternation(result, counts);
}

/**
 * Parse a single element (note, rest, group, or alternation).
 */
function parseElement(stream: TokenStream): ParseResult {
	const token = stream.current();

	if (token.type === "NOTE") {
		stream.advance();
		const step = parseNote(token.value, 1.0);
		return { beats: [{ steps: [step] }] };
	}

	if (token.type === "REST") {
		stream.advance();
		return { beats: [{ steps: [{ type: "rest", dur: 1.0 }] }] };
	}

	if (token.type === "LBRACKET") {
		return parseGroup(stream);
	}

	if (token.type === "LANGLE") {
		return parseAlternate(stream, () => parseElementWithModifiers(stream));
	}

	throw new Error(
		`Unexpected token '${token.type}' at position ${token.position}`,
	);
}
