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

import { tokenize } from "../tokenize";
import type { Beat, Pattern, Step, Token } from "../types";
import { countItemsUntil } from "./count-items";
import { euclidean } from "./euclidean";
import { parseNote } from "./parse-note";
import type { ParseResult } from "./types";

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

class Parser {
	private tokens: Token[];
	private position = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): Pattern {
		const beats = this.parseTopLevel();

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
	 * Parse an element and any postfix modifiers, then check for glide/stack
	 */
	private parseElementWithModifiers(): ParseResult {
		const baseResult = this.parseElement();

		let result: ParseResult;
		if (this.check("REPLICATE")) {
			result = this.applyReplicate(baseResult);
		} else if (this.check("ELONGATE")) {
			result = this.applyElongate(baseResult);
		} else if (this.check("LPAREN")) {
			result = this.applyEuclidean(baseResult);
		} else if (this.check("MULTIPLY")) {
			result = this.applyMultiply(baseResult);
		} else {
			result = baseResult;
		}

		// Check for stack operator (comma) - creates polyphonic steps
		if (this.check("COMMA")) {
			return this.applyStack(result);
		}

		// Check for glide operator - binds tighter than space, looser than postfix
		if (this.check("GLIDE")) {
			return this.applyGlide(result);
		}

		return result;
	}

	/**
	 * _ - Glide: tie left and right elements together (legato)
	 * Marks last step of left with tieStart, first step of right with tie
	 */
	private applyGlide(leftResult: ParseResult): ParseResult {
		this.expect("GLIDE");

		// Parse right side (which may itself have glides, creating a chain)
		const rightResult = this.parseElementWithModifiers();

		// Mark last step of left side with tieStart
		const leftBeats = leftResult.beats;
		if (leftBeats.length > 0) {
			const lastBeat = leftBeats[leftBeats.length - 1];
			if (lastBeat && lastBeat.length > 0) {
				const lastStep = lastBeat[lastBeat.length - 1];
				if (lastStep && lastStep.type === "note") {
					lastBeat[lastBeat.length - 1] = { ...lastStep, tieStart: true };
				}
			}
		}

		// Mark first step of right side with tie
		const rightBeats = rightResult.beats;
		if (rightBeats.length > 0) {
			const firstBeat = rightBeats[0];
			if (firstBeat && firstBeat.length > 0) {
				const firstStep = firstBeat[0];
				if (firstStep && firstStep.type === "note") {
					firstBeat[0] = { ...firstStep, tie: true };
				}
			}
		}

		return { beats: [...leftBeats, ...rightBeats] };
	}

	/**
	 * , - Stack: combine notes into a polyphonic chord
	 * c4,e4,g4 creates a single step with freqs: [c4, e4, g4]
	 */
	private applyStack(leftResult: ParseResult): ParseResult {
		this.expect("COMMA");

		// Parse right side (which may itself have stacks, creating c4,e4,g4)
		const rightResult = this.parseElementWithModifiers();

		// Merge freqs from left and right into a single polyphonic step
		// Both left and right should be single-beat, single-step for simple stacking
		const leftBeats = leftResult.beats;
		const rightBeats = rightResult.beats;

		// For now, only support stacking single notes into chords
		// c4,e4,g4 → one beat with one step containing all freqs
		if (leftBeats.length === 1 && rightBeats.length === 1) {
			const leftBeat = leftBeats[0];
			const rightBeat = rightBeats[0];

			if (leftBeat && rightBeat && leftBeat.length === 1 && rightBeat.length === 1) {
				const leftStep = leftBeat[0];
				const rightStep = rightBeat[0];

				if (leftStep?.type === "note" && rightStep?.type === "note") {
					// Combine freqs into one polyphonic step
					const combinedFreqs = [...leftStep.freqs, ...rightStep.freqs];
					const mergedStep = {
						...leftStep,
						freqs: combinedFreqs,
					};
					return { beats: [[mergedStep]] };
				}
			}
		}

		// Fallback: if we can't merge, just concatenate (shouldn't happen for valid input)
		return { beats: [...leftBeats, ...rightBeats] };
	}

	/**
	 * Parse a single element (note, rest, group, or alternation)
	 */
	private parseElement(): ParseResult {
		const token = this.current();

		if (token.type === "NOTE") {
			this.advance();
			const step = parseNote(token.value, 1.0);
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

		const itemCount = this.countItems("RBRACKET");
		const itemDuration = itemCount > 0 ? 1.0 / itemCount : 1.0;

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
	 */
	private parseGroupItem(baseDuration: number): Step[] {
		const token = this.current();

		let steps: Step[];

		if (token.type === "NOTE") {
			this.advance();
			steps = [parseNote(token.value, baseDuration)];
		} else if (token.type === "REST") {
			this.advance();
			steps = [{ type: "rest", dur: baseDuration }];
		} else if (token.type === "LBRACKET") {
			steps = this.parseNestedGroup(baseDuration);
		} else if (token.type === "LANGLE") {
			steps = this.parseGroupAlternate(baseDuration);
		} else {
			throw new Error(
				`Unexpected token '${token.type}' at position ${token.position}`,
			);
		}

		if (this.check("MULTIPLY")) {
			steps = this.applyMultiplyToSteps(steps, baseDuration);
		} else if (this.check("REPLICATE")) {
			steps = this.applyReplicateToSteps(steps, baseDuration);
		} else if (this.check("ELONGATE")) {
			steps = this.applyElongateToSteps(steps, baseDuration);
		}

		// Check for glide within group
		if (this.check("GLIDE")) {
			return this.applyGlideToSteps(steps, baseDuration);
		}

		return steps;
	}

	/**
	 * _ within a group - ties steps together for legato
	 */
	private applyGlideToSteps(leftSteps: Step[], baseDuration: number): Step[] {
		this.expect("GLIDE");

		// Parse right side
		const rightSteps = this.parseGroupItem(baseDuration);

		// Mark last step of left with tieStart
		if (leftSteps.length > 0) {
			const lastStep = leftSteps[leftSteps.length - 1];
			if (lastStep && lastStep.type === "note") {
				leftSteps[leftSteps.length - 1] = { ...lastStep, tieStart: true };
			}
		}

		// Mark first step of right with tie
		if (rightSteps.length > 0) {
			const firstStep = rightSteps[0];
			if (firstStep && firstStep.type === "note") {
				rightSteps[0] = { ...firstStep, tie: true };
			}
		}

		return [...leftSteps, ...rightSteps];
	}

	/**
	 * Parse a nested group [...] within another group
	 */
	private parseNestedGroup(parentDuration: number): Step[] {
		this.expect("LBRACKET");

		const itemCount = this.countItems("RBRACKET");
		const itemDuration =
			itemCount > 0 ? parentDuration / itemCount : parentDuration;

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

		const alternateCount = this.countItems("RANGLE");
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
	 * Parse alternation <a b c> at top level
	 */
	private parseAlternate(): ParseResult {
		this.expect("LANGLE");

		const alternateCount = this.countItems("RANGLE");
		const allSteps: Step[] = [];
		let cycleIndex = 0;

		while (!this.check("RANGLE") && !this.isAtEnd()) {
			const result = this.parseElementWithModifiers();

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
		return { beats: [allSteps] };
	}

	// --- Modifiers (top-level) ---

	/**
	 * *n - Multiply: repeat n times within the same beat
	 */
	private applyMultiply(result: ParseResult): ParseResult {
		this.expect("MULTIPLY");

		if (this.check("LANGLE")) {
			return this.applyMultiplyWithAlternation(result);
		}

		const count = this.parseNumber();

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
	 * !n - Replicate: expand to n separate beats
	 */
	private applyReplicate(result: ParseResult): ParseResult {
		this.expect("REPLICATE");
		const count = this.parseNumber();

		const newBeats: Beat[] = [];
		for (let i = 0; i < count; i++) {
			for (const beat of result.beats) {
				newBeats.push(beat.map((step) => ({ ...step, dur: 1.0 })));
			}
		}

		return { beats: newBeats };
	}

	/**
	 * @n - Elongate: sustain across n beats (tied notes)
	 */
	private applyElongate(result: ParseResult): ParseResult {
		this.expect("ELONGATE");
		const count = this.parseNumber();

		const newBeats: Beat[] = [];

		for (const beat of result.beats) {
			// First beat gets tieStart marker (gate holds high, no 80% duty cycle)
			const firstBeat: Beat = beat.map((step): Step => {
				if (step.type === "note" && count > 1) {
					return { ...step, dur: 1.0, tieStart: true };
				}
				return { ...step, dur: 1.0 };
			});
			newBeats.push(firstBeat);

			// Continuation beats get tie marker
			for (let i = 1; i < count; i++) {
				newBeats.push(beat.map((step) => ({ ...step, dur: 1.0, tie: true })));
			}
		}

		return { beats: newBeats };
	}

	/**
	 * (k,n) - Euclidean: spread k hits over n beats
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
				for (const beat of result.beats) {
					newBeats.push(beat.map((step) => ({ ...step, dur: 1.0 })));
				}
			} else {
				newBeats.push([{ type: "rest", dur: 1.0 }]);
			}
		}

		return { beats: newBeats };
	}

	// --- Modifiers (within group) ---

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
	 * @n within a group - extends duration within the beat
	 */
	private applyElongateToSteps(steps: Step[], baseDuration: number): Step[] {
		this.expect("ELONGATE");
		const count = this.parseNumber();

		return steps.map((step) => ({ ...step, dur: baseDuration * count }));
	}

	// --- Token helpers ---

	private countItems(terminator: Token["type"]): number {
		return countItemsUntil(this.tokens, this.position, terminator);
	}

	private parseNumber(): number {
		const token = this.expect("NUMBER");
		return Number.parseInt(token.value, 10);
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
