/**
 * Evaluator: Expr → RuntimePattern
 *
 * Transforms the AST into a flat list of voice events ready for runtime query.
 * Voice IDs are assigned during evaluation based on stack structure.
 */

import { euclidean } from "../parse/euclidean";
import { pitchToFreq } from "./pitch-to-freq";
import type { Expr, RuntimePattern, VoiceEvent } from "./types";
import { voiceCount } from "./types";

/**
 * Evaluation context - tracks position and voice assignment during tree walk.
 */
interface EvalContext {
	/** Current beat position */
	beatStart: number;
	/** Duration allocated to this expression (in beats) */
	duration: number;
	/** Starting voice ID for this subtree */
	voiceOffset: number;
	/** Current cycle index (for alternation) */
	cycle: number;
	/** Total cycles in pattern (for alternation) */
	cycleTotal: number;
	/** Accumulated probability (from nested maybe) */
	prob?: number;
	/** Are we inside a tie? (gate stays high) */
	inTie: boolean;
}

/**
 * Evaluate an Expr AST to RuntimePattern.
 */
export function evaluate(expr: Expr): RuntimePattern {
	const voices = voiceCount(expr);
	const events: VoiceEvent[] = [];

	const ctx: EvalContext = {
		beatStart: 0,
		duration: countBeats(expr),
		voiceOffset: 0,
		cycle: 0,
		cycleTotal: 1,
		prob: undefined,
		inTie: false,
	};

	evalExpr(expr, ctx, events);

	return {
		totalBeats: ctx.duration,
		voiceCount: voices,
		events: events.sort((a, b) => a.beatStart - b.beatStart || a.voiceId - b.voiceId),
	};
}

/**
 * Count total beats an expression occupies at top level.
 */
function countBeats(expr: Expr): number {
	switch (expr.type) {
		case "note":
		case "rest":
		case "group":
		case "alt":
		case "stack":
		case "tie":
			return 1;

		case "seq":
			return expr.children.reduce((sum, child) => sum + countBeats(child), 0);

		case "multiply":
			return countBeats(expr.child);

		case "replicate":
			return countBeats(expr.child) * expr.count;

		case "elongate":
			return countBeats(expr.child) * expr.count;

		case "euclidean":
			return expr.steps;

		case "maybe":
			return countBeats(expr.child);
	}
}

/**
 * Recursively evaluate expression, adding events to the list.
 */
function evalExpr(expr: Expr, ctx: EvalContext, events: VoiceEvent[]): void {
	switch (expr.type) {
		case "note":
			evalNote(expr.pitch, ctx, events);
			break;

		case "rest":
			// Rest produces no events - silence for the duration
			break;

		case "seq":
			evalSeq(expr.children, ctx, events);
			break;

		case "group":
			evalGroup(expr.children, ctx, events);
			break;

		case "alt":
			evalAlt(expr.children, ctx, events);
			break;

		case "stack":
			evalStack(expr.children, ctx, events);
			break;

		case "tie":
			evalTie(expr.children, ctx, events);
			break;

		case "multiply":
			evalMultiply(expr.child, expr.count, ctx, events);
			break;

		case "replicate":
			evalReplicate(expr.child, expr.count, ctx, events);
			break;

		case "elongate":
			evalElongate(expr.child, expr.count, ctx, events);
			break;

		case "euclidean":
			evalEuclidean(expr.child, expr.hits, expr.steps, ctx, events);
			break;

		case "maybe":
			evalMaybe(expr.child, expr.prob, ctx, events);
			break;
	}
}

/** Evaluate a note - emit event for each voice */
function evalNote(pitch: string, ctx: EvalContext, events: VoiceEvent[]): void {
	const freq = pitchToFreq(pitch);

	events.push({
		voiceId: ctx.voiceOffset,
		freq,
		beatStart: ctx.beatStart,
		beatEnd: ctx.beatStart + ctx.duration,
		offset: 0,
		dur: 1, // Full duration within allocated time
		prob: ctx.prob,
		cycle: ctx.cycleTotal > 1 ? ctx.cycle : undefined,
		cycleTotal: ctx.cycleTotal > 1 ? ctx.cycleTotal : undefined,
		tied: ctx.inTie || undefined,
	});
}

/** Evaluate sequence - children laid out sequentially, each = 1 beat by default */
function evalSeq(children: Expr[], ctx: EvalContext, events: VoiceEvent[]): void {
	// Calculate total beats from children
	const totalChildBeats = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalChildBeats === 0) return;

	// Each child gets proportional duration based on its beat count
	const beatScale = ctx.duration / totalChildBeats;
	let currentBeat = ctx.beatStart;

	for (const child of children) {
		const childBeats = countBeats(child);
		const childDuration = childBeats * beatScale;

		evalExpr(child, {
			...ctx,
			beatStart: currentBeat,
			duration: childDuration,
		}, events);

		currentBeat += childDuration;
	}
}

/** Evaluate group - children subdivide duration equally */
function evalGroup(children: Expr[], ctx: EvalContext, events: VoiceEvent[]): void {
	if (children.length === 0) return;

	const childDuration = ctx.duration / children.length;
	let currentBeat = ctx.beatStart;

	for (const child of children) {
		evalExpr(child, {
			...ctx,
			beatStart: currentBeat,
			duration: childDuration,
		}, events);

		currentBeat += childDuration;
	}
}

/** Evaluate alternation - all children at same position with cycle tags */
function evalAlt(children: Expr[], ctx: EvalContext, events: VoiceEvent[]): void {
	if (children.length === 0) return;

	// Each child gets a cycle index
	for (let i = 0; i < children.length; i++) {
		evalExpr(children[i]!, {
			...ctx,
			cycle: i,
			cycleTotal: children.length,
		}, events);
	}
}

/** Evaluate stack - parallel voices, each branch fills full duration */
function evalStack(children: Expr[], ctx: EvalContext, events: VoiceEvent[]): void {
	let voiceOffset = ctx.voiceOffset;

	for (const child of children) {
		const childVoices = voiceCount(child);

		evalExpr(child, {
			...ctx,
			voiceOffset,
		}, events);

		voiceOffset += childVoices;
	}
}

/** Evaluate tie - children sequential, gate stays high */
function evalTie(children: Expr[], ctx: EvalContext, events: VoiceEvent[]): void {
	if (children.length === 0) return;

	const childDuration = ctx.duration / children.length;
	let currentBeat = ctx.beatStart;

	for (const child of children) {
		evalExpr(child, {
			...ctx,
			beatStart: currentBeat,
			duration: childDuration,
			inTie: true,
		}, events);

		currentBeat += childDuration;
	}
}

/** Evaluate multiply - repeat child n times within same duration */
function evalMultiply(child: Expr, count: number, ctx: EvalContext, events: VoiceEvent[]): void {
	if (count <= 0) return;

	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		evalExpr(child, {
			...ctx,
			beatStart: ctx.beatStart + i * repDuration,
			duration: repDuration,
		}, events);
	}
}

/** Evaluate replicate - repeat child n times sequentially (expands duration) */
function evalReplicate(child: Expr, count: number, ctx: EvalContext, events: VoiceEvent[]): void {
	if (count <= 0) return;

	// Total duration is split among repetitions
	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		evalExpr(child, {
			...ctx,
			beatStart: ctx.beatStart + i * repDuration,
			duration: repDuration,
		}, events);
	}
}

/** Evaluate elongate - stretch child across n beats */
function evalElongate(child: Expr, count: number, ctx: EvalContext, events: VoiceEvent[]): void {
	// Duration already accounts for elongation via countBeats
	// Just pass through with full duration
	evalExpr(child, ctx, events);
}

/** Evaluate euclidean - distribute child across k of n steps */
function evalEuclidean(
	child: Expr,
	hits: number,
	steps: number,
	ctx: EvalContext,
	events: VoiceEvent[],
): void {
	const pattern = euclidean(hits, steps);
	const stepDuration = ctx.duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			evalExpr(child, {
				...ctx,
				beatStart: ctx.beatStart + i * stepDuration,
				duration: stepDuration,
			}, events);
		}
		// Rests (pattern[i] === false) produce no events
	}
}

/** Evaluate maybe - attach probability to child */
function evalMaybe(child: Expr, prob: number, ctx: EvalContext, events: VoiceEvent[]): void {
	// Multiply probabilities if already in a maybe context
	const combinedProb = ctx.prob !== undefined ? ctx.prob * prob : prob;

	evalExpr(child, {
		...ctx,
		prob: combinedProb,
	}, events);
}
