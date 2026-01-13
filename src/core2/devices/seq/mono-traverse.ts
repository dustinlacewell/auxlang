/**
 * Mono AST traversal - outputs plain numbers instead of PolySignal.
 *
 * This is a simplified version of traverse.ts for single-voice patterns.
 * Used by mono-seq.ts as the building block for polyphonic sequences.
 */

import { euclidean } from "./expr/euclidean";
import { pitchToFreq } from "./expr/pitch-to-freq";
import { countBeats } from "./expr/traverse";
import type { Expr } from "./expr/types";

/** Time context for current sample */
export interface MonoTimeContext {
	beatIndex: number;
	phase: number;
	cycle: number;
	totalBeats: number;
}

/** Mono traversal state */
export interface MonoTraversalState {
	probDecisions: Map<string, boolean>;
	lastCV: number;
	lastEventId: string;
}

/** Mono output - plain numbers */
export interface MonoSeqOutput {
	cv: number;
	gate: number;
	trig: number;
}

export function createMonoTraversalState(): MonoTraversalState {
	return {
		probDecisions: new Map(),
		lastCV: 0,
		lastEventId: "",
	};
}

export function clearMonoProbDecisions(state: MonoTraversalState): void {
	state.probDecisions.clear();
}

/** Internal traverse context */
interface TraverseCtx {
	absoluteTime: number;
	beatStart: number;
	duration: number;
	cycle: number;
	inTie: boolean;
	exprPath: string;
}

/** Result from traversing - may or may not have a note */
interface TraverseResult {
	freq: number | null;
	gate: number;
	eventId: string | null;
}

/**
 * Traverse a mono AST and produce output for current time.
 */
export function traverseMono(
	expr: Expr,
	time: MonoTimeContext,
	state: MonoTraversalState,
): MonoSeqOutput {
	const totalBeats = countBeats(expr);
	const wrappedBeat = time.beatIndex % totalBeats;
	const absoluteTime = wrappedBeat + time.phase;

	const ctx: TraverseCtx = {
		absoluteTime,
		beatStart: 0,
		duration: totalBeats,
		cycle: time.cycle,
		inTie: false,
		exprPath: "root",
	};

	const result = traverseExpr(expr, ctx, state);

	// Build output
	let cv = state.lastCV;
	let gate = 0;
	let trig = 0;

	if (result.freq !== null) {
		cv = result.freq;
		state.lastCV = cv;
		gate = result.gate;

		// Trigger on new event
		if (result.eventId !== null && result.eventId !== state.lastEventId) {
			trig = 1;
			state.lastEventId = result.eventId;
		}
	}

	return { cv, gate, trig };
}

function traverseExpr(expr: Expr, ctx: TraverseCtx, state: MonoTraversalState): TraverseResult {
	switch (expr.type) {
		case "note":
			return traverseNote(expr.pitch, ctx);

		case "rest":
			return { freq: null, gate: 0, eventId: null };

		case "seq":
			return traverseSeq(expr.children, ctx, state);

		case "group":
			return traverseGroup(expr.children, ctx, state);

		case "alt":
			return traverseAlt(expr.children, ctx, state);

		case "stack":
			// For mono patterns, stack should have been eliminated by projectVoice
			// If we hit one, just take the first child
			return expr.children[0]
				? traverseExpr(expr.children[0], ctx, state)
				: { freq: null, gate: 0, eventId: null };

		case "tie":
			return traverseTie(expr.children, ctx, state);

		case "multiply":
			return traverseMultiply(expr.child, expr.count, ctx, state);

		case "replicate":
			return traverseReplicate(expr.child, expr.count, ctx, state);

		case "elongate":
			return traverseExpr(expr.child, ctx, state);

		case "euclidean":
			return traverseEuclidean(expr.child, expr.hits, expr.steps, ctx, state);

		case "maybe":
			return traverseMaybe(expr.child, expr.prob, ctx, state);
	}
}

function traverseNote(pitch: string, ctx: TraverseCtx): TraverseResult {
	// Check if current time is within this note's duration
	if (ctx.absoluteTime < ctx.beatStart || ctx.absoluteTime >= ctx.beatStart + ctx.duration) {
		return { freq: null, gate: 0, eventId: null };
	}

	const freq = pitchToFreq(pitch);
	const timeInEvent = ctx.absoluteTime - ctx.beatStart;
	const gate = timeInEvent < ctx.duration - 0.001 ? 1 : 0;
	const eventId = `${ctx.exprPath}:${ctx.beatStart}:${ctx.cycle}`;

	return { freq, gate, eventId };
}

function traverseSeq(
	children: Expr[],
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	const totalChildBeats = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalChildBeats === 0) return { freq: null, gate: 0, eventId: null };

	const beatScale = ctx.duration / totalChildBeats;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childBeats = countBeats(child);
		const childDuration = childBeats * beatScale;

		const result = traverseExpr(
			child,
			{
				...ctx,
				beatStart: currentBeat,
				duration: childDuration,
				exprPath: `${ctx.exprPath}.seq[${i}]`,
			},
			state,
		);

		if (result.freq !== null) return result;
		currentBeat += childDuration;
	}

	return { freq: null, gate: 0, eventId: null };
}

function traverseGroup(
	children: Expr[],
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	if (children.length === 0) return { freq: null, gate: 0, eventId: null };

	const totalWeight = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalWeight === 0) return { freq: null, gate: 0, eventId: null };

	const beatScale = ctx.duration / totalWeight;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childWeight = countBeats(child);
		const childDuration = childWeight * beatScale;

		const result = traverseExpr(
			child,
			{
				...ctx,
				beatStart: currentBeat,
				duration: childDuration,
				exprPath: `${ctx.exprPath}.group[${i}]`,
			},
			state,
		);

		if (result.freq !== null) return result;
		currentBeat += childDuration;
	}

	return { freq: null, gate: 0, eventId: null };
}

function traverseAlt(
	children: Expr[],
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	if (children.length === 0) return { freq: null, gate: 0, eventId: null };

	const selectedIndex = ctx.cycle % children.length;
	const child = children[selectedIndex]!;

	return traverseExpr(
		child,
		{
			...ctx,
			exprPath: `${ctx.exprPath}.alt[${selectedIndex}]`,
		},
		state,
	);
}

function traverseTie(
	children: Expr[],
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	if (children.length === 0) return { freq: null, gate: 0, eventId: null };

	const childDuration = ctx.duration / children.length;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;

		const result = traverseExpr(
			child,
			{
				...ctx,
				beatStart: currentBeat,
				duration: childDuration,
				inTie: true,
				exprPath: `${ctx.exprPath}.tie[${i}]`,
			},
			state,
		);

		if (result.freq !== null) return result;
		currentBeat += childDuration;
	}

	return { freq: null, gate: 0, eventId: null };
}

function traverseMultiply(
	child: Expr,
	count: number,
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	if (count <= 0) return { freq: null, gate: 0, eventId: null };

	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		const result = traverseExpr(
			child,
			{
				...ctx,
				beatStart: ctx.beatStart + i * repDuration,
				duration: repDuration,
				exprPath: `${ctx.exprPath}.mult[${i}]`,
			},
			state,
		);

		if (result.freq !== null) return result;
	}

	return { freq: null, gate: 0, eventId: null };
}

function traverseReplicate(
	child: Expr,
	count: number,
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	if (count <= 0) return { freq: null, gate: 0, eventId: null };

	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		const result = traverseExpr(
			child,
			{
				...ctx,
				beatStart: ctx.beatStart + i * repDuration,
				duration: repDuration,
				exprPath: `${ctx.exprPath}.rep[${i}]`,
			},
			state,
		);

		if (result.freq !== null) return result;
	}

	return { freq: null, gate: 0, eventId: null };
}

function traverseEuclidean(
	child: Expr,
	hits: number,
	steps: number,
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	const pattern = euclidean(hits, steps);
	const stepDuration = ctx.duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			const result = traverseExpr(
				child,
				{
					...ctx,
					beatStart: ctx.beatStart + i * stepDuration,
					duration: stepDuration,
					exprPath: `${ctx.exprPath}.euc[${i}]`,
				},
				state,
			);

			if (result.freq !== null) return result;
		}
	}

	return { freq: null, gate: 0, eventId: null };
}

function traverseMaybe(
	child: Expr,
	prob: number,
	ctx: TraverseCtx,
	state: MonoTraversalState,
): TraverseResult {
	const probKey = `${ctx.exprPath}.maybe:${ctx.cycle}`;

	if (!state.probDecisions.has(probKey)) {
		const pass = Math.random() < prob;
		state.probDecisions.set(probKey, pass);
	}

	if (!state.probDecisions.get(probKey)) {
		return { freq: null, gate: 0, eventId: null };
	}

	return traverseExpr(
		child,
		{
			...ctx,
			exprPath: `${ctx.exprPath}.maybe`,
		},
		state,
	);
}
