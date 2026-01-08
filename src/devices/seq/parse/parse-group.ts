import type { Step } from "../types";
import { applyElongateToSteps } from "./apply-elongate";
import { applyGlideToSteps } from "./apply-glide";
import { applyMaybeToSteps } from "./apply-maybe";
import {
	applyMultiplyToSteps,
	applyMultiplyToStepsWithAlternation,
} from "./apply-multiply";
import { applyReplicateToSteps } from "./apply-replicate";
import { parseNote } from "./parse-note";
import type { TokenStream } from "./token-stream";
import type { ParseResult } from "./types";

/**
 * Parse a group [...] - all items subdivide within ONE beat.
 *
 * Strategy:
 * 1. Count items to calculate each item's duration share
 * 2. Parse each item (which may be nested groups or alternations)
 * 3. Apply any postfix modifiers to steps
 * 4. Collect all steps into a single beat
 */
export function parseGroup(stream: TokenStream): ParseResult {
	stream.expect("LBRACKET");

	const itemCount = stream.countItemsUntil("RBRACKET");
	const itemDuration = itemCount > 0 ? 1.0 / itemCount : 1.0;

	const steps: Step[] = [];
	while (!stream.check("RBRACKET") && !stream.isAtEnd()) {
		const itemSteps = parseGroupItem(stream, itemDuration);
		steps.push(...itemSteps);
	}

	stream.expect("RBRACKET");
	return { beats: [{ steps }] };
}

/**
 * Parse an item within a group - returns steps (not beats).
 *
 * Handles: notes, rests, nested groups, alternations, and modifiers.
 */
export function parseGroupItem(stream: TokenStream, baseDuration: number): Step[] {
	const token = stream.current();
	let steps: Step[];

	// Parse base element
	if (token.type === "NOTE") {
		stream.advance();
		steps = [parseNote(token.value, baseDuration)];
	} else if (token.type === "REST") {
		stream.advance();
		steps = [{ type: "rest", dur: baseDuration }];
	} else if (token.type === "LBRACKET") {
		steps = parseNestedGroup(stream, baseDuration);
	} else if (token.type === "LANGLE") {
		steps = parseGroupAlternate(stream, baseDuration);
	} else {
		throw new Error(
			`Unexpected token '${token.type}' at position ${token.position}`,
		);
	}

	// Apply postfix modifiers
	if (stream.check("MULTIPLY")) {
		stream.expect("MULTIPLY");
		if (stream.check("LANGLE")) {
			steps = parseMultiplyWithAlternationSteps(stream, steps);
		} else {
			const count = stream.parseNumber();
			steps = applyMultiplyToSteps(steps, count);
		}
	} else if (stream.check("REPLICATE")) {
		stream.expect("REPLICATE");
		const count = stream.parseNumber();
		steps = applyReplicateToSteps(steps, count, baseDuration);
	} else if (stream.check("ELONGATE")) {
		stream.expect("ELONGATE");
		const count = stream.parseNumber();
		steps = applyElongateToSteps(steps, count, baseDuration);
	}

	// Maybe modifier can follow other modifiers
	// Token value contains probability: "0.5" for ?, "0.2" for ?0.2, etc.
	if (stream.check("MAYBE")) {
		const token = stream.expect("MAYBE");
		const prob = Number.parseFloat(token.value);
		steps = applyMaybeToSteps(steps, prob);
	}

	// Check for glide within group
	if (stream.check("GLIDE")) {
		stream.expect("GLIDE");
		const rightSteps = parseGroupItem(stream, baseDuration);
		return applyGlideToSteps(steps, rightSteps);
	}

	return steps;
}

/**
 * Parse a nested group [...] within another group.
 * Subdivides the parent's duration allocation among its children.
 */
function parseNestedGroup(stream: TokenStream, parentDuration: number): Step[] {
	stream.expect("LBRACKET");

	const itemCount = stream.countItemsUntil("RBRACKET");
	const itemDuration = itemCount > 0 ? parentDuration / itemCount : parentDuration;

	const steps: Step[] = [];
	while (!stream.check("RBRACKET") && !stream.isAtEnd()) {
		const itemSteps = parseGroupItem(stream, itemDuration);
		steps.push(...itemSteps);
	}

	stream.expect("RBRACKET");
	return steps;
}

/**
 * Parse alternation <a b c> within a group.
 * Each alternative gets tagged with cycle index.
 */
function parseGroupAlternate(stream: TokenStream, baseDuration: number): Step[] {
	stream.expect("LANGLE");

	const alternateCount = stream.countItemsUntil("RANGLE");
	const allSteps: Step[] = [];
	let cycleIndex = 0;

	while (!stream.check("RANGLE") && !stream.isAtEnd()) {
		const steps = parseGroupItem(stream, baseDuration);

		for (const step of steps) {
			allSteps.push({
				...step,
				cycle: cycleIndex,
				cycleTotal: alternateCount,
			});
		}

		cycleIndex++;
	}

	stream.expect("RANGLE");
	return allSteps;
}

/**
 * Parse *<1 2 3> within a group.
 */
function parseMultiplyWithAlternationSteps(
	stream: TokenStream,
	steps: Step[],
): Step[] {
	stream.expect("LANGLE");

	const counts: number[] = [];
	while (!stream.check("RANGLE") && !stream.isAtEnd()) {
		counts.push(stream.parseNumber());
	}
	stream.expect("RANGLE");

	return applyMultiplyToStepsWithAlternation(steps, counts);
}
