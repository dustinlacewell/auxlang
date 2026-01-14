/**
 * Generic AST traversal with visitor pattern.
 * 
 * Factors out the subdivision logic so it can be reused for:
 * - Event collection (audio playback)
 * - Source position extraction (visualization)
 * - Analysis and debugging
 */

import type { Expr } from "./types";
import { countBeats } from "./traverse";
import { euclidean } from "./euclidean";

/**
 * Visitor interface for traversing expressions.
 * Implement this to do different things during traversal.
 */
export interface ExprVisitor<TContext> {
	/**
	 * Called when visiting a note atom.
	 * @param expr - The note expression (includes srcStart/srcEnd)
	 * @param beatStart - Absolute beat position where note starts
	 * @param duration - Duration in beats
	 * @param inTie - Whether this note is part of a tie (not the first note)
	 * @param context - User-provided context
	 */
	visitNote(
		expr: Expr & { type: "note" },
		beatStart: number,
		duration: number,
		inTie: boolean,
		context: TContext,
	): void;

	/**
	 * Called when visiting a rest atom.
	 * @param expr - The rest expression (includes srcStart/srcEnd)
	 * @param beatStart - Absolute beat position where rest starts
	 * @param duration - Duration in beats
	 * @param context - User-provided context
	 */
	visitRest(expr: Expr & { type: "rest" }, beatStart: number, duration: number, context: TContext): void;

	/**
	 * Called when entering any expression (before recursing into children).
	 * Optional - used for hierarchical highlighting of modifiers.
	 * @param expr - The expression being entered
	 * @param beatStart - Absolute beat position where this expr starts
	 * @param duration - Duration allocated to this expr
	 * @param context - User-provided context
	 */
	enterExpr?(expr: Expr, beatStart: number, duration: number, context: TContext): void;
}

/**
 * Traverse an expression tree, calling visitor methods for each atom.
 * 
 * @param expr - Expression to traverse
 * @param beatStart - Absolute beat position where this expr starts
 * @param duration - Duration allocated to this expr (in beats)
 * @param cycle - Current pattern cycle (for alternation)
 * @param probDecisions - Cached probability decisions (key -> boolean)
 * @param inTie - Whether we're inside a tie (affects trigger behavior)
 * @param visitor - Visitor to call for each atom
 * @param context - User-provided context passed to visitor
 */
export function traverseExpr<TContext>(
	expr: Expr,
	beatStart: number,
	duration: number,
	cycle: number,
	probDecisions: Record<string, boolean>,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
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
			traverseSeq(
				expr.children,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				pathKey,
				visitor,
				context,
			);
			break;

		case "group":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseGroup(
				expr.children,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				pathKey,
				visitor,
				context,
			);
			break;

		case "alt": {
			visitor.enterExpr?.(expr, beatStart, duration, context);
			if (expr.children.length === 0) break;
			const selected = cycle % expr.children.length;
			const child = expr.children[selected]!;
			traverseExpr(
				child,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				`${pathKey}.alt${selected}`,
				visitor,
				context,
			);
			break;
		}

		case "stack":
			// Stacks play all children in parallel - traverse all for visualization
			// Each child gets the full duration (they overlap in time)
			visitor.enterExpr?.(expr, beatStart, duration, context);
			for (let i = 0; i < expr.children.length; i++) {
				const child = expr.children[i]!;
				traverseExpr(
					child,
					beatStart,
					duration,
					cycle,
					probDecisions,
					inTie,
					`${pathKey}.stack${i}`,
					visitor,
					context,
				);
			}
			break;

		case "tie":
			traverseTie(
				expr.children,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				pathKey,
				visitor,
				context,
			);
			break;

		case "multiply":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseMultiply(
				expr.child,
				expr.count,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				pathKey,
				visitor,
				context,
			);
			break;

		case "replicate":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseReplicate(
				expr.child,
				expr.count,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				pathKey,
				visitor,
				context,
			);
			break;

		case "elongate":
			visitor.enterExpr?.(expr, beatStart, duration, context);
			traverseExpr(
				expr.child,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				`${pathKey}.elong`,
				visitor,
				context,
			);
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
				probDecisions,
				inTie,
				pathKey,
				visitor,
				context,
			);
			break;

		case "maybe": {
			const probKey = `${pathKey}.maybe:${cycle}`;
			if (!(probKey in probDecisions)) {
				probDecisions[probKey] = Math.random() < expr.prob;
			}
			if (!probDecisions[probKey]) {
				break;
			}
			traverseExpr(
				expr.child,
				beatStart,
				duration,
				cycle,
				probDecisions,
				inTie,
				`${pathKey}.maybe`,
				visitor,
				context,
			);
			break;
		}
	}
}

function traverseSeq<TContext>(
	children: Expr[],
	beatStart: number,
	duration: number,
	cycle: number,
	probDecisions: Record<string, boolean>,
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

		traverseExpr(
			child,
			currentBeat,
			childDuration,
			cycle,
			probDecisions,
			inTie,
			`${pathKey}.seq${i}`,
			visitor,
			context,
		);

		currentBeat += childDuration;
	}
}

function traverseGroup<TContext>(
	children: Expr[],
	beatStart: number,
	duration: number,
	cycle: number,
	probDecisions: Record<string, boolean>,
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

		traverseExpr(
			child,
			currentBeat,
			childDuration,
			cycle,
			probDecisions,
			inTie,
			`${pathKey}.grp${i}`,
			visitor,
			context,
		);

		currentBeat += childDuration;
	}
}

function traverseTie<TContext>(
	children: Expr[],
	beatStart: number,
	duration: number,
	cycle: number,
	probDecisions: Record<string, boolean>,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	if (children.length === 0) return;

	const childDuration = duration / children.length;
	let currentBeat = beatStart;

	// For ties: first child triggers (unless already in a tie), subsequent children don't
	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childInTie = inTie || i > 0; // First child inherits parent's inTie, rest are tied

		traverseExpr(
			child,
			currentBeat,
			childDuration,
			cycle,
			probDecisions,
			childInTie,
			`${pathKey}.tie${i}`,
			visitor,
			context,
		);

		currentBeat += childDuration;
	}
}

function traverseMultiply<TContext>(
	child: Expr,
	count: number,
	beatStart: number,
	duration: number,
	cycle: number,
	probDecisions: Record<string, boolean>,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	if (count <= 0) return;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(
			child,
			beatStart + i * repDuration,
			repDuration,
			cycle,
			probDecisions,
			inTie,
			`${pathKey}.mult${i}`,
			visitor,
			context,
		);
	}
}

function traverseReplicate<TContext>(
	child: Expr,
	count: number,
	beatStart: number,
	duration: number,
	cycle: number,
	probDecisions: Record<string, boolean>,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	if (count <= 0) return;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(
			child,
			beatStart + i * repDuration,
			repDuration,
			cycle,
			probDecisions,
			inTie,
			`${pathKey}.rep${i}`,
			visitor,
			context,
		);
	}
}

function traverseEuclidean<TContext>(
	child: Expr,
	hits: number,
	steps: number,
	beatStart: number,
	duration: number,
	cycle: number,
	probDecisions: Record<string, boolean>,
	inTie: boolean,
	pathKey: string,
	visitor: ExprVisitor<TContext>,
	context: TContext,
): void {
	const pattern = euclidean(hits, steps);
	const stepDuration = duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			traverseExpr(
				child,
				beatStart + i * stepDuration,
				stepDuration,
				cycle,
				probDecisions,
				inTie,
				`${pathKey}.euc${i}`,
				visitor,
				context,
			);
		}
	}
}
