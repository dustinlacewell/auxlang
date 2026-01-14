/**
 * Generic AST traversal with visitor pattern.
 *
 * Factors out the subdivision logic so it can be reused for:
 * - Event collection (audio playback)
 * - Source position extraction (visualization)
 * - Analysis and debugging
 */

import type { Expr } from "./types";
import { countBeats } from "./count-beats";
import { euclidean } from "./euclidean";

/**
 * Visitor interface for traversing expressions.
 * Implement this to do different things during traversal.
 */
export interface ExprVisitor<TContext> {
	visitNote(
		expr: Expr & { type: "note" },
		beatStart: number,
		duration: number,
		inTie: boolean,
		context: TContext,
	): void;

	visitRest(
		expr: Expr & { type: "rest" },
		beatStart: number,
		duration: number,
		context: TContext,
	): void;

	enterExpr?(expr: Expr, beatStart: number, duration: number, context: TContext): void;
}

/**
 * State for tracking alt positions across visits.
 * Each alt tracks its current index and a visit key to detect new visits.
 */
export interface AltState {
	index: number;
	lastVisitKey: string;
}

/**
 * Traversal state that persists across cycles.
 */
export interface TraversalState {
	probDecisions: Record<string, boolean>;
	altPositions: Record<string, AltState>;
}

export function createTraversalState(): TraversalState {
	return { probDecisions: {}, altPositions: {} };
}

/**
 * Traverse an expression tree, calling visitor methods for each atom.
 */
export function traverseExpr<TContext>(
	expr: Expr,
	beatStart: number,
	duration: number,
	cycle: number,
	state: TraversalState,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
	inStack = false,
): void {
	switch (expr.type) {
		case "note":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			visitor.visitNote(expr, beatStart, duration, inTie, context);
			break;

		case "rest":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			visitor.visitRest(expr, beatStart, duration, context);
			break;

		case "seq":
			// Inside a stack, sequences behave like alternations (select one child per cycle)
			if (inStack && expr.children.length > 1) {
				const selected = cycle % expr.children.length;
				traverseExpr(
					expr.children[selected]!,
					beatStart,
					duration,
					cycle,
					state,
					inTie,
					`${pathKey}.seq${selected}`,
					visitor,
					context,
					false,
				);
			} else {
				traverseSeq(expr.children, beatStart, duration, cycle, state, inTie, pathKey, visitor, context);
			}
			break;

		case "group":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseGroup(expr.children, beatStart, duration, cycle, state, inTie, pathKey, visitor, context);
			break;

		case "alt": {
			visitor.enterExpr?.(expr, beatStart, duration, context);
			if (expr.children.length === 0) break;

			// Track visits per alt - only advance when actually visited
			const visitKey = `${cycle}:${beatStart.toFixed(6)}:${duration.toFixed(6)}`;
			const altKey = pathKey;
			const entry = state.altPositions[altKey];

			let selectedIndex: number;
			if (!entry) {
				selectedIndex = 0;
				state.altPositions[altKey] = { index: selectedIndex, lastVisitKey: visitKey };
			} else {
				if (entry.lastVisitKey !== visitKey) {
					entry.index = (entry.index + 1) % expr.children.length;
					entry.lastVisitKey = visitKey;
				}
				selectedIndex = entry.index;
			}

			const child = expr.children[selectedIndex]!;
			traverseExpr(
				child,
				beatStart,
				duration,
				cycle,
				state,
				inTie,
				`${pathKey}.alt${selectedIndex}`,
				visitor,
				context,
			);
			break;
		}

		case "stack":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			for (let i = 0; i < expr.children.length; i++) {
				const child = expr.children[i]!;
				traverseExpr(
					child,
					beatStart,
					duration,
					cycle,
					state,
					inTie,
					`${pathKey}.stack${i}`,
					visitor,
					context,
					true,
				);
			}
			break;

		case "tie":
			traverseTie(expr.children, beatStart, duration, cycle, state, inTie, pathKey, visitor, context);
			break;

		case "multiply":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseMultiply(expr.child, expr.count, beatStart, duration, cycle, state, inTie, pathKey, visitor, context);
			break;

		case "replicate":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseReplicate(expr.child, expr.count, beatStart, duration, cycle, state, inTie, pathKey, visitor, context);
			break;

		case "elongate":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseExpr(expr.child, beatStart, duration, cycle, state, inTie, `${pathKey}.elong`, visitor, context);
			break;

		case "euclidean":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseEuclidean(
				expr.child,
				expr.hits,
				expr.steps,
				beatStart,
				duration,
				cycle,
				state,
				inTie,
				pathKey,
				visitor,
				context,
			);
			break;

		case "maybe": {
			const probKey = `${pathKey}.maybe:${cycle}`;
			if (!(probKey in state.probDecisions)) {
				state.probDecisions[probKey] = Math.random() < expr.prob;
			}
			if (!state.probDecisions[probKey]) {
				break;
			}
			traverseExpr(expr.child, beatStart, duration, cycle, state, inTie, `${pathKey}.maybe`, visitor, context);
			break;
		}
	}
}

function traverseSeq<TContext>(
	children: Expr[],
	beatStart: number,
	duration: number,
	cycle: number,
	state: TraversalState,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	const totalChildBeats = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalChildBeats === 0) return;

	const beatScale = duration / totalChildBeats;
	let currentBeat = beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childBeats = countBeats(child);
		const childDuration = childBeats * beatScale;

		traverseExpr(child, currentBeat, childDuration, cycle, state, inTie, `${pathKey}.seq${i}`, visitor, context);
		currentBeat += childDuration;
	}
}

function traverseGroup<TContext>(
	children: Expr[],
	beatStart: number,
	duration: number,
	cycle: number,
	state: TraversalState,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	if (children.length === 0) return;

	const totalWeight = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalWeight === 0) return;

	const beatScale = duration / totalWeight;
	let currentBeat = beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childWeight = countBeats(child);
		const childDuration = childWeight * beatScale;

		traverseExpr(child, currentBeat, childDuration, cycle, state, inTie, `${pathKey}.grp${i}`, visitor, context);
		currentBeat += childDuration;
	}
}

function traverseTie<TContext>(
	children: Expr[],
	beatStart: number,
	duration: number,
	cycle: number,
	state: TraversalState,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	if (children.length === 0) return;

	const childDuration = duration / children.length;
	let currentBeat = beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childInTie = inTie || i > 0;

		traverseExpr(child, currentBeat, childDuration, cycle, state, childInTie, `${pathKey}.tie${i}`, visitor, context);
		currentBeat += childDuration;
	}
}

function traverseMultiply<TContext>(
	child: Expr,
	count: number,
	beatStart: number,
	duration: number,
	cycle: number,
	state: TraversalState,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	if (count <= 0) return;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(child, beatStart + i * repDuration, repDuration, cycle, state, inTie, `${pathKey}.mult${i}`, visitor, context);
	}
}

function traverseReplicate<TContext>(
	child: Expr,
	count: number,
	beatStart: number,
	duration: number,
	cycle: number,
	state: TraversalState,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	if (count <= 0) return;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(child, beatStart + i * repDuration, repDuration, cycle, state, inTie, `${pathKey}.rep${i}`, visitor, context);
	}
}

function traverseEuclidean<TContext>(
	child: Expr,
	hits: number,
	steps: number,
	beatStart: number,
	duration: number,
	cycle: number,
	state: TraversalState,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	const pattern = euclidean(hits, steps);
	const stepDuration = duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			traverseExpr(child, beatStart + i * stepDuration, stepDuration, cycle, state, inTie, `${pathKey}.euc${i}`, visitor, context);
		}
	}
}
