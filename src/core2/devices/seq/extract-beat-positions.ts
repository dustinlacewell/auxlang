/**
 * Extract character positions for each beat in a seq pattern.
 * 
 * Uses the same traversal logic as event collection to properly handle
 * nested rational subdivision, modifiers, and all timing complexities.
 * 
 * Uses AST source positions directly (srcStart/srcEnd) instead of token
 * index correlation, which correctly handles alternation and other
 * constructs that skip parts of the pattern.
 */

import type { Expr } from "./expr/types";
import { countBeats } from "./expr/traverse";
import { traverseExpr, type ExprVisitor } from "./expr/generic-traverse";

export type BeatPositionType = "note" | "modifier" | "container";

export interface BeatPosition {
	noteId: string;
	start: number;
	end: number;
	type: BeatPositionType;
}

/**
 * Context for position extraction visitor.
 */
interface PositionExtractionContext {
	beatIndex: number;
	positions: BeatPosition[];
	positionCounter: number;
	seenPositions: Set<string>; // Dedupe by "start:end"
}

/**
 * Check if a time range contains the target beat position.
 * Uses epsilon only on start boundary to avoid double-highlighting at beat transitions.
 */
function containsBeatPosition(beatStart: number, duration: number, targetBeatPos: number): boolean {
	const beatEnd = beatStart + duration;
	const epsilon = 0.0001;
	// Epsilon on start only - at exact beat boundary, match the new beat, not the ending one
	return targetBeatPos >= beatStart - epsilon && targetBeatPos < beatEnd;
}

/**
 * Visitor that extracts source positions for atoms and modifiers overlapping with a target beat.
 */
class PositionExtractor implements ExprVisitor<PositionExtractionContext> {
	visitNote(
		expr: Expr & { type: "note" },
		beatStart: number,
		duration: number,
		_inTie: boolean,
		context: PositionExtractionContext,
	): void {
		if (!containsBeatPosition(beatStart, duration, context.beatIndex)) return;
		if (expr.srcStart === undefined || expr.srcEnd === undefined) return;

		const key = `${expr.srcStart}:${expr.srcEnd}`;
		if (context.seenPositions.has(key)) return;
		context.seenPositions.add(key);

		context.positions.push({
			noteId: `note${context.positionCounter++}`,
			start: expr.srcStart,
			end: expr.srcEnd,
			type: "note",
		});
	}

	visitRest(
		expr: Expr & { type: "rest" },
		beatStart: number,
		duration: number,
		context: PositionExtractionContext,
	): void {
		if (!containsBeatPosition(beatStart, duration, context.beatIndex)) return;
		if (expr.srcStart === undefined || expr.srcEnd === undefined) return;

		const key = `${expr.srcStart}:${expr.srcEnd}`;
		if (context.seenPositions.has(key)) return;
		context.seenPositions.add(key);

		context.positions.push({
			noteId: `note${context.positionCounter++}`,
			start: expr.srcStart,
			end: expr.srcEnd,
			type: "note",
		});
	}

	enterExpr(
		expr: Expr,
		beatStart: number,
		duration: number,
		context: PositionExtractionContext,
	): void {
		if (!containsBeatPosition(beatStart, duration, context.beatIndex)) return;

		// Only emit positions for modifiers and containers that have source positions
		const srcStart = (expr as { srcStart?: number }).srcStart;
		const srcEnd = (expr as { srcEnd?: number }).srcEnd;
		if (srcStart === undefined || srcEnd === undefined) return;

		// Determine type: modifiers vs containers
		const modifierTypes = ["multiply", "replicate", "elongate", "euclidean"];
		const containerTypes = ["alt", "group", "stack"];
		
		let posType: BeatPositionType;
		if (modifierTypes.includes(expr.type)) {
			posType = "modifier";
		} else if (containerTypes.includes(expr.type)) {
			posType = "container";
		} else {
			return;
		}

		const key = `${srcStart}:${srcEnd}`;
		if (context.seenPositions.has(key)) return;
		context.seenPositions.add(key);

		context.positions.push({
			noteId: `${posType}${context.positionCounter++}`,
			start: srcStart,
			end: srcEnd,
			type: posType,
		});
	}
}

/**
 * Extract all source positions that contribute to a specific beat.
 * 
 * @param expr - Parsed expression tree
 * @param _pattern - Original pattern string (unused, kept for API compatibility)
 * @param beatIndex - Which beat to extract positions for
 * @param cycle - Current cycle (for alternation)
 * @returns Array of source positions that play during this beat
 */
export function extractPositionsForBeat(
	expr: Expr,
	_pattern: string,
	beatIndex: number,
	cycle: number,
	probDecisions?: Record<string, boolean>,
): BeatPosition[] {
	const totalBeats = countBeats(expr);
	const positions: BeatPosition[] = [];
	const context: PositionExtractionContext = {
		beatIndex,
		positions,
		positionCounter: 0,
		seenPositions: new Set(),
	};

	const visitor = new PositionExtractor();
	const decisions = probDecisions ?? {};
	traverseExpr(expr, 0, totalBeats, cycle, decisions, false, "root", visitor, context);

	return positions;
}

/**
 * Extract beat positions from a pattern string.
 * Returns an array where index = beat number, value = character positions.
 * 
 * NOTE: This is a simplified version that assumes cycle 0.
 * For accurate visualization during playback, use extractPositionsForBeat with the actual cycle.
 */
export function extractBeatPositions(pattern: string): BeatPosition[] {
	// This function is kept for backwards compatibility but is no longer accurate
	// for complex patterns. It just returns empty positions.
	// Use extractPositionsForBeat instead.
	return [];
}
