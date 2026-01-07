/**
 * Parser for mini-notation patterns.
 *
 * Converts tokens into a beat-structured pattern where each beat
 * corresponds to one clock trigger.
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
 */

import { noteToFreq } from "./note-to-freq";
import { tokenize } from "./tokenize";
import type { Beat, NoteStep, Pattern, RestStep, Step, Token } from "./types";

const NOTE_REGEX = /^([a-gA-G])([#b])?([0-9])?$/;

/**
 * Compute euclidean rhythm pattern.
 * Returns array of booleans: true = hit, false = rest
 */
function euclidean(hits: number, steps: number): boolean[] {
	if (hits >= steps) return new Array(steps).fill(true) as boolean[];
	if (hits <= 0) return new Array(steps).fill(false) as boolean[];

	// Bjorklund's algorithm
	const pattern: boolean[] = [];
	const counts: number[] = [];
	const remainders: number[] = [hits];

	let divisor = steps - hits;
	let level = 0;

	while ((remainders[level] ?? 0) > 1) {
		const currentRemainder = remainders[level] ?? 1;
		counts.push(Math.floor(divisor / currentRemainder));
		const newRemainder = divisor % currentRemainder;
		divisor = currentRemainder;
		remainders.push(newRemainder);
		level++;
	}
	counts.push(divisor);

	function build(lvl: number): void {
		if (lvl === -1) {
			pattern.push(false);
		} else if (lvl === -2) {
			pattern.push(true);
		} else {
			for (let i = 0; i < (counts[lvl] ?? 0); i++) {
				build(lvl - 1);
			}
			if ((remainders[lvl] ?? 0) > 0) {
				build(lvl - 2);
			}
		}
	}

	build(level);
	return pattern;
}

/**
 * Parse a mini-notation pattern string into a beat-structured Pattern.
 *
 * @param input - Pattern string like "c3 e3 [g3 b3] ~"
 * @returns Pattern as array of beats (each beat = one clock trigger)
 */
export function parse(input: string): Pattern {
	const tokens = tokenize(input);
	const parser = new Parser(tokens);
	return parser.parse();
}

/**
 * Result of parsing an element - can produce multiple beats
 */
interface ParseResult {
	beats: Beat[];
}

class Parser {
	private tokens: Token[];
	private position = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): Pattern {
		const beats = this.parseTopLevel();

		// Ensure we consumed all tokens
		if (!this.isAtEnd()) {
			const token = this.current();
			throw new Error(
				`Unexpected token '${token.type}' at position ${token.position}`,
			);
		}

		return beats;
	}

	/**
	 * Parse top-level sequence - each element becomes one or more beats
	 */
	private parseTopLevel(): Beat[] {
		const beats: Beat[] = [];

		while (!this.isAtEnd()) {
			const result = this.parseElementWithModifiers();
			beats.push(...result.beats);
		}

		return beats;
	}

	/**
	 * Parse an element and any postfix modifiers
	 * Returns one or more beats
	 */
	private parseElementWithModifiers(): ParseResult {
		// Parse the base element (note, rest, group, or alternation)
		const baseResult = this.parseElement();

		// Check for postfix modifiers that affect beat count
		if (this.check("REPLICATE")) {
			return this.applyReplicate(baseResult);
		}
		if (this.check("ELONGATE")) {
			return this.applyElongate(baseResult);
		}
		if (this.check("LPAREN")) {
			return this.applyEuclidean(baseResult);
		}
		if (this.check("MULTIPLY")) {
			return this.applyMultiply(baseResult);
		}

		return baseResult;
	}

	/**
	 * Parse a single element (note, rest, group, or alternation)
	 * Returns a single beat containing the element's steps
	 */
	private parseElement(): ParseResult {
		const token = this.current();

		if (token.type === "NOTE") {
			this.advance();
			const step = this.parseNote(token.value, 1.0);
			return { beats: [[step]] };
		}

		if (token.type === "REST") {
			this.advance();
			return { beats: [[{ type: "rest", dur: 1.0 }]] };
		}

		if (token.type === "LBRACKET") {
			return this.parseGroup();
		}

		if (token.type === "LANGLE") {
			return this.parseAlternate();
		}

		throw new Error(
			`Unexpected token '${token.type}' at position ${token.position}`,
		);
	}

	/**
	 * Parse a group [...] - all items subdivide within ONE beat
	 */
	private parseGroup(): ParseResult {
		this.expect("LBRACKET");

		// Count top-level items to calculate subdivision
		const itemCount = this.countItemsUntil("RBRACKET");
		const itemDuration = itemCount > 0 ? 1.0 / itemCount : 1.0;

		// Parse the contents into steps (all within one beat)
		const steps: Step[] = [];
		while (!this.check("RBRACKET") && !this.isAtEnd()) {
			const itemSteps = this.parseGroupItem(itemDuration);
			steps.push(...itemSteps);
		}

		this.expect("RBRACKET");
		return { beats: [steps] };
	}

	/**
	 * Parse an item within a group - returns steps (not beats)
	 * This handles nested groups and modifiers within a beat
	 */
	private parseGroupItem(baseDuration: number): Step[] {
		const token = this.current();

		let steps: Step[];

		if (token.type === "NOTE") {
			this.advance();
			steps = [this.parseNote(token.value, baseDuration)];
		} else if (token.type === "REST") {
			this.advance();
			steps = [{ type: "rest", dur: baseDuration }];
		} else if (token.type === "LBRACKET") {
			// Nested group - further subdivides
			steps = this.parseNestedGroup(baseDuration);
		} else if (token.type === "LANGLE") {
			// Alternation within group
			steps = this.parseGroupAlternate(baseDuration);
		} else {
			throw new Error(
				`Unexpected token '${token.type}' at position ${token.position}`,
			);
		}

		// Apply modifiers that work within a beat
		if (this.check("MULTIPLY")) {
			return this.applyMultiplyToSteps(steps, baseDuration);
		}
		if (this.check("REPLICATE")) {
			return this.applyReplicateToSteps(steps, baseDuration);
		}
		if (this.check("ELONGATE")) {
			return this.applyElongateToSteps(steps, baseDuration);
		}

		return steps;
	}

	/**
	 * Parse a nested group [...] within another group
	 */
	private parseNestedGroup(parentDuration: number): Step[] {
		this.expect("LBRACKET");

		const itemCount = this.countItemsUntil("RBRACKET");
		const itemDuration = itemCount > 0 ? parentDuration / itemCount : parentDuration;

		const steps: Step[] = [];
		while (!this.check("RBRACKET") && !this.isAtEnd()) {
			const itemSteps = this.parseGroupItem(itemDuration);
			steps.push(...itemSteps);
		}

		this.expect("RBRACKET");
		return steps;
	}

	/**
	 * Parse alternation <a b c> within a group
	 */
	private parseGroupAlternate(baseDuration: number): Step[] {
		this.expect("LANGLE");

		const alternateCount = this.countItemsUntil("RANGLE");
		const allSteps: Step[] = [];
		let cycleIndex = 0;

		while (!this.check("RANGLE") && !this.isAtEnd()) {
			const steps = this.parseGroupItem(baseDuration);

			for (const step of steps) {
				allSteps.push({
					...step,
					cycle: cycleIndex,
					cycleTotal: alternateCount,
				});
			}

			cycleIndex++;
		}

		this.expect("RANGLE");
		return allSteps;
	}

	/**
	 * Parse alternation <a b c> at top level - cycles through options each pattern cycle
	 */
	private parseAlternate(): ParseResult {
		this.expect("LANGLE");

		const alternateCount = this.countItemsUntil("RANGLE");
		const allSteps: Step[] = [];
		let cycleIndex = 0;

		while (!this.check("RANGLE") && !this.isAtEnd()) {
			// Parse each alternative as if it were a single element
			const result = this.parseElementWithModifiers();

			// Flatten all beats from this alternative into steps, tagged with cycle
			for (const beat of result.beats) {
				for (const step of beat) {
					allSteps.push({
						...step,
						cycle: cycleIndex,
						cycleTotal: alternateCount,
					});
				}
			}

			cycleIndex++;
		}

		this.expect("RANGLE");

		// All alternatives go into one beat, filtered by cycle at runtime
		return { beats: [allSteps] };
	}

	/**
	 * *n - Multiply: repeat n times within the same beat
	 * "c3*2" subdivides the beat: [c3 c3] each with dur=0.5
	 */
	private applyMultiply(result: ParseResult): ParseResult {
		this.expect("MULTIPLY");

		// Check for alternating count *<1 2 3>
		if (this.check("LANGLE")) {
			return this.applyMultiplyWithAlternation(result);
		}

		const count = this.parseNumber();

		// Subdivide all steps within each beat
		const newBeats: Beat[] = [];
		for (const beat of result.beats) {
			const newSteps: Step[] = [];
			for (let i = 0; i < count; i++) {
				for (const step of beat) {
					newSteps.push({ ...step, dur: step.dur / count });
				}
			}
			newBeats.push(newSteps);
		}

		return { beats: newBeats };
	}

	/**
	 * *<1 2 3> - Multiply with alternating counts
	 */
	private applyMultiplyWithAlternation(result: ParseResult): ParseResult {
		this.expect("LANGLE");

		const counts: number[] = [];
		while (!this.check("RANGLE") && !this.isAtEnd()) {
			counts.push(this.parseNumber());
		}
		this.expect("RANGLE");

		if (counts.length === 0) {
			return result;
		}

		const cycleTotal = counts.length;
		const newBeats: Beat[] = [];

		for (const beat of result.beats) {
			const allSteps: Step[] = [];

			for (let cycleIndex = 0; cycleIndex < cycleTotal; cycleIndex++) {
				const count = counts[cycleIndex] ?? 1;

				for (let i = 0; i < count; i++) {
					for (const step of beat) {
						allSteps.push({
							...step,
							dur: step.dur / count,
							cycle: cycleIndex,
							cycleTotal,
						});
					}
				}
			}

			newBeats.push(allSteps);
		}

		return { beats: newBeats };
	}

	/**
	 * *n within a group - subdivides steps within their allocation
	 */
	private applyMultiplyToSteps(steps: Step[], _baseDuration: number): Step[] {
		this.expect("MULTIPLY");

		if (this.check("LANGLE")) {
			return this.applyMultiplyToStepsWithAlternation(steps);
		}

		const count = this.parseNumber();
		const result: Step[] = [];

		for (let i = 0; i < count; i++) {
			for (const step of steps) {
				result.push({ ...step, dur: step.dur / count });
			}
		}

		return result;
	}

	private applyMultiplyToStepsWithAlternation(steps: Step[]): Step[] {
		this.expect("LANGLE");

		const counts: number[] = [];
		while (!this.check("RANGLE") && !this.isAtEnd()) {
			counts.push(this.parseNumber());
		}
		this.expect("RANGLE");

		if (counts.length === 0) {
			return steps;
		}

		const cycleTotal = counts.length;
		const result: Step[] = [];

		for (let cycleIndex = 0; cycleIndex < cycleTotal; cycleIndex++) {
			const count = counts[cycleIndex] ?? 1;

			for (let i = 0; i < count; i++) {
				for (const step of steps) {
					result.push({
						...step,
						dur: step.dur / count,
						cycle: cycleIndex,
						cycleTotal,
					});
				}
			}
		}

		return result;
	}

	/**
	 * !n - Replicate: expand to n separate beats
	 * "c3!2" becomes two beats: [[c3], [c3]]
	 */
	private applyReplicate(result: ParseResult): ParseResult {
		this.expect("REPLICATE");
		const count = this.parseNumber();

		const newBeats: Beat[] = [];
		for (let i = 0; i < count; i++) {
			for (const beat of result.beats) {
				// Clone beat with dur=1.0 for each step
				newBeats.push(beat.map(step => ({ ...step, dur: 1.0 })));
			}
		}

		return { beats: newBeats };
	}

	/**
	 * !n within a group - repeats steps at same duration
	 */
	private applyReplicateToSteps(steps: Step[], baseDuration: number): Step[] {
		this.expect("REPLICATE");
		const count = this.parseNumber();

		const result: Step[] = [];
		for (let i = 0; i < count; i++) {
			for (const step of steps) {
				result.push({ ...step, dur: baseDuration });
			}
		}

		return result;
	}

	/**
	 * @n - Elongate: sustain across n beats (tied notes)
	 * "c3@2" becomes two beats: [[c3], [c3 tie:true]]
	 */
	private applyElongate(result: ParseResult): ParseResult {
		this.expect("ELONGATE");
		const count = this.parseNumber();

		const newBeats: Beat[] = [];

		for (const beat of result.beats) {
			// First beat is normal
			newBeats.push(beat.map(step => ({ ...step, dur: 1.0 })));

			// Subsequent beats are tied
			for (let i = 1; i < count; i++) {
				newBeats.push(beat.map(step => ({ ...step, dur: 1.0, tie: true })));
			}
		}

		return { beats: newBeats };
	}

	/**
	 * @n within a group - extends duration within the beat
	 */
	private applyElongateToSteps(steps: Step[], baseDuration: number): Step[] {
		this.expect("ELONGATE");
		const count = this.parseNumber();

		return steps.map(step => ({ ...step, dur: baseDuration * count }));
	}

	/**
	 * (k,n) - Euclidean: spread k hits over n beats
	 * "c3(3,8)" becomes 8 beats with euclidean distribution
	 */
	private applyEuclidean(result: ParseResult): ParseResult {
		this.expect("LPAREN");
		const hits = this.parseNumber();
		this.expect("COMMA");
		const totalSteps = this.parseNumber();
		this.expect("RPAREN");

		const pattern = euclidean(hits, totalSteps);
		const newBeats: Beat[] = [];

		for (const isHit of pattern) {
			if (isHit) {
				// Play the original content
				for (const beat of result.beats) {
					newBeats.push(beat.map(step => ({ ...step, dur: 1.0 })));
				}
			} else {
				// Rest beat
				newBeats.push([{ type: "rest", dur: 1.0 }]);
			}
		}

		return { beats: newBeats };
	}

	/**
	 * Parse a number token and return its value
	 */
	private parseNumber(): number {
		const token = this.expect("NUMBER");
		return Number.parseInt(token.value, 10);
	}

	private parseNote(value: string, duration: number): NoteStep {
		const match = value.match(NOTE_REGEX);
		if (!match) {
			throw new Error(`Invalid note format: ${value}`);
		}

		const name = match[1] as string;
		const accidental = (match[2] as "#" | "b" | undefined) ?? null;
		const octave = match[3] ? Number.parseInt(match[3], 10) : 4;

		const freq = noteToFreq(name, accidental, octave);
		return { type: "note", freq, dur: duration };
	}

	/**
	 * Count top-level items until a terminator token.
	 * Does not consume tokens.
	 */
	private countItemsUntil(terminator: Token["type"]): number {
		let count = 0;
		let depth = 0;

		for (let i = this.position; i < this.tokens.length; i++) {
			const token = this.tokens[i];
			if (!token) break;

			// Track nesting depth
			if (token.type === "LBRACKET" || token.type === "LANGLE") depth++;
			if (token.type === "RBRACKET" || token.type === "RANGLE") {
				if (depth === 0) {
					if (token.type === terminator) break;
					break;
				}
				depth--;
			}

			// Count items at depth 0
			if (depth === 0) {
				if (
					token.type === "NOTE" ||
					token.type === "REST" ||
					token.type === "LBRACKET" ||
					token.type === "LANGLE"
				) {
					count++;
				}
			}
		}

		return count;
	}

	private current(): Token {
		const token = this.tokens[this.position];
		if (!token) {
			throw new Error("Unexpected end of input");
		}
		return token;
	}

	private check(type: Token["type"]): boolean {
		return this.current().type === type;
	}

	private advance(): Token {
		const token = this.current();
		this.position++;
		return token;
	}

	private expect(type: Token["type"]): Token {
		if (!this.check(type)) {
			const token = this.current();
			throw new Error(
				`Expected '${type}' but got '${token.type}' at position ${token.position}`,
			);
		}
		return this.advance();
	}

	private isAtEnd(): boolean {
		return this.current().type === "EOF";
	}
}
