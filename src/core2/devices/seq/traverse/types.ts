/**
 * Types for AST traversal.
 */

import type { Expr } from "../ast/types";

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

/**
 * Create a fresh traversal state.
 */
export function createTraversalState(): TraversalState {
	return { probDecisions: {}, altPositions: {} };
}
