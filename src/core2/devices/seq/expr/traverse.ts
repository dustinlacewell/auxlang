/**
 * Stateful AST traversal for sequencer.
 *
 * Instead of flattening to events, we traverse the AST per-sample,
 * maintaining state for probability decisions and voice tracking.
 * This preserves hierarchical structure and enables correct probability semantics.
 */

import { euclidean } from "./euclidean";
import { pitchToFreq } from "./pitch-to-freq";
import type { Expr, PolySignal, SeqOutput } from "./types";
import { voiceCount } from "./types";

/**
 * Time context for current sample.
 */
export interface TimeContext {
	/** Current beat index (0-indexed) */
	beatIndex: number;
	/** Phase within beat (0-1) */
	phase: number;
	/** Pattern cycle (for alternation) */
	cycle: number;
	/** Total beats in pattern */
	totalBeats: number;
}

/**
 * Traversal state maintained across samples.
 */
export interface TraversalState {
	/** Probability decisions keyed by expr identity + cycle */
	probDecisions: Map<string, boolean>;
	/** CV per voice (sample-and-hold) */
	voiceCV: Map<number, number>;
	/** Last event ID per voice for trigger detection */
	lastEventId: Map<number, string>;
}

/**
 * Create initial traversal state.
 */
export function createTraversalState(): TraversalState {
	return {
		probDecisions: new Map(),
		voiceCV: new Map(),
		lastEventId: new Map(),
	};
}

/**
 * Clear probability decisions (call at pattern cycle boundary).
 */
export function clearProbDecisions(state: TraversalState): void {
	state.probDecisions.clear();
}

/**
 * Count total beats an expression occupies.
 */
export function countBeats(expr: Expr): number {
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
 * Traverse context - tracks position and voice assignment during traversal.
 */
interface TraverseContext {
	/** Absolute time in beats (beatIndex + phase) */
	absoluteTime: number;
	/** Beat position where this expr starts */
	beatStart: number;
	/** Duration allocated to this expr (in beats) */
	duration: number;
	/** Starting voice ID for this subtree */
	voiceOffset: number;
	/** Current cycle (for alternation) */
	cycle: number;
	/** Are we inside a tie? */
	inTie: boolean;
	/** Unique path for probability caching */
	exprPath: string;
}

/**
 * Voice output for a single voice.
 */
interface VoiceOutput {
	voiceId: number;
	freq: number;
	gate: number;
	trig: number;
}

/**
 * Traverse the AST and produce output for current time.
 */
export function traverse(expr: Expr, time: TimeContext, state: TraversalState): SeqOutput {
	const voices = voiceCount(expr);
	const totalBeats = countBeats(expr);

	// Wrap beat index for looping
	const wrappedBeat = time.beatIndex % totalBeats;
	const absoluteTime = wrappedBeat + time.phase;

	const ctx: TraverseContext = {
		absoluteTime,
		beatStart: 0,
		duration: totalBeats,
		voiceOffset: 0,
		cycle: time.cycle,
		inTie: false,
		exprPath: "root",
	};

	// Traverse and collect voice outputs
	const outputs: VoiceOutput[] = [];
	traverseExpr(expr, ctx, state, outputs);

	// Build PolySignal arrays - output all voices, inactive ones get gate=0
	const cv: PolySignal = [];
	const gate: PolySignal = [];
	const trig: PolySignal = [];

	for (let i = 0; i < voices; i++) {
		const output = outputs.find((o) => o.voiceId === i);
		if (output) {
			// Active voice - update CV state and output
			state.voiceCV.set(i, output.freq);
			cv.push({ id: i, value: output.freq });
			gate.push({ id: i, value: output.gate });
			trig.push({ id: i, value: output.trig });
		} else {
			// Inactive voice - output with gate=0 to maintain continuity
			const lastCV = state.voiceCV.get(i) ?? 0;
			cv.push({ id: i, value: lastCV });
			gate.push({ id: i, value: 0 });
			trig.push({ id: i, value: 0 });
		}
	}

	return { cv, gate, trig };
}

/**
 * Recursively traverse expression, emitting voice outputs.
 */
function traverseExpr(
	expr: Expr,
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	switch (expr.type) {
		case "note":
			traverseNote(expr.pitch, ctx, state, outputs);
			break;

		case "rest":
			// Rest produces no output
			break;

		case "seq":
			traverseSeq(expr.children, ctx, state, outputs);
			break;

		case "group":
			traverseGroup(expr.children, ctx, state, outputs);
			break;

		case "alt":
			traverseAlt(expr.children, ctx, state, outputs);
			break;

		case "stack":
			traverseStack(expr.children, ctx, state, outputs);
			break;

		case "tie":
			traverseTie(expr.children, ctx, state, outputs);
			break;

		case "multiply":
			traverseMultiply(expr.child, expr.count, ctx, state, outputs);
			break;

		case "replicate":
			traverseReplicate(expr.child, expr.count, ctx, state, outputs);
			break;

		case "elongate":
			traverseElongate(expr.child, expr.count, ctx, state, outputs);
			break;

		case "euclidean":
			traverseEuclidean(expr.child, expr.hits, expr.steps, ctx, state, outputs);
			break;

		case "maybe":
			traverseMaybe(expr.child, expr.prob, ctx, state, outputs);
			break;
	}
}

/**
 * Traverse a note - emit output if active.
 */
function traverseNote(
	pitch: string,
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	// Check if current time is within this note's duration
	if (ctx.absoluteTime < ctx.beatStart || ctx.absoluteTime >= ctx.beatStart + ctx.duration) {
		return;
	}

	const freq = pitchToFreq(pitch);
	const voiceId = ctx.voiceOffset;

	// Update CV (sample-and-hold)
	state.voiceCV.set(voiceId, freq);

	// Gate fills the note's full duration
	// The tiny gap at the end allows retriggering of consecutive same-pitch notes
	const timeInEvent = ctx.absoluteTime - ctx.beatStart;
	const gate = timeInEvent < ctx.duration - 0.001 ? 1 : 0;

	// Detect trigger (rising edge)
	const eventId = `${ctx.exprPath}:${ctx.beatStart}:${ctx.cycle}`;
	const lastId = state.lastEventId.get(voiceId);
	const trig = lastId !== eventId ? 1 : 0;
	state.lastEventId.set(voiceId, eventId);

	outputs.push({ voiceId, freq, gate, trig });
}

/**
 * Traverse sequence - children laid out sequentially.
 */
function traverseSeq(
	children: Expr[],
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	const totalChildBeats = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalChildBeats === 0) return;

	const beatScale = ctx.duration / totalChildBeats;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childBeats = countBeats(child);
		const childDuration = childBeats * beatScale;

		traverseExpr(
			child,
			{
				...ctx,
				beatStart: currentBeat,
				duration: childDuration,
				exprPath: `${ctx.exprPath}.seq[${i}]`,
			},
			state,
			outputs,
		);

		currentBeat += childDuration;
	}
}

/**
 * Traverse group - children subdivide duration proportionally by weight.
 */
function traverseGroup(
	children: Expr[],
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	if (children.length === 0) return;

	// Weight children by countBeats for Strudel-like @ weighting
	const totalWeight = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalWeight === 0) return;

	const beatScale = ctx.duration / totalWeight;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childWeight = countBeats(child);
		const childDuration = childWeight * beatScale;

		traverseExpr(
			child,
			{
				...ctx,
				beatStart: currentBeat,
				duration: childDuration,
				exprPath: `${ctx.exprPath}.group[${i}]`,
			},
			state,
			outputs,
		);

		currentBeat += childDuration;
	}
}

/**
 * Traverse alternation - select child based on cycle.
 */
function traverseAlt(
	children: Expr[],
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	if (children.length === 0) return;

	const selectedIndex = ctx.cycle % children.length;
	const child = children[selectedIndex]!;

	traverseExpr(
		child,
		{
			...ctx,
			exprPath: `${ctx.exprPath}.alt[${selectedIndex}]`,
		},
		state,
		outputs,
	);
}

/**
 * Traverse stack - parallel voices.
 */
function traverseStack(
	children: Expr[],
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	let voiceOffset = ctx.voiceOffset;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childVoices = voiceCount(child);

		traverseExpr(
			child,
			{
				...ctx,
				voiceOffset,
				exprPath: `${ctx.exprPath}.stack[${i}]`,
			},
			state,
			outputs,
		);

		voiceOffset += childVoices;
	}
}

/**
 * Traverse tie - children sequential, gate stays high.
 */
function traverseTie(
	children: Expr[],
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	if (children.length === 0) return;

	const childDuration = ctx.duration / children.length;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;

		traverseExpr(
			child,
			{
				...ctx,
				beatStart: currentBeat,
				duration: childDuration,
				inTie: true,
				exprPath: `${ctx.exprPath}.tie[${i}]`,
			},
			state,
			outputs,
		);

		currentBeat += childDuration;
	}
}

/**
 * Traverse multiply - repeat child n times within duration.
 */
function traverseMultiply(
	child: Expr,
	count: number,
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	if (count <= 0) return;

	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(
			child,
			{
				...ctx,
				beatStart: ctx.beatStart + i * repDuration,
				duration: repDuration,
				exprPath: `${ctx.exprPath}.mult[${i}]`,
			},
			state,
			outputs,
		);
	}
}

/**
 * Traverse replicate - repeat child n times sequentially.
 */
function traverseReplicate(
	child: Expr,
	count: number,
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	if (count <= 0) return;

	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(
			child,
			{
				...ctx,
				beatStart: ctx.beatStart + i * repDuration,
				duration: repDuration,
				exprPath: `${ctx.exprPath}.rep[${i}]`,
			},
			state,
			outputs,
		);
	}
}

/**
 * Traverse elongate - stretch child across duration.
 */
function traverseElongate(
	child: Expr,
	count: number,
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	// Duration already accounts for elongation via countBeats
	traverseExpr(
		child,
		{
			...ctx,
			exprPath: `${ctx.exprPath}.elong`,
		},
		state,
		outputs,
	);
}

/**
 * Traverse euclidean - distribute child across k of n steps.
 */
function traverseEuclidean(
	child: Expr,
	hits: number,
	steps: number,
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	const pattern = euclidean(hits, steps);
	const stepDuration = ctx.duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			traverseExpr(
				child,
				{
					...ctx,
					beatStart: ctx.beatStart + i * stepDuration,
					duration: stepDuration,
					exprPath: `${ctx.exprPath}.euc[${i}]`,
				},
				state,
				outputs,
			);
		}
	}
}

/**
 * Traverse maybe - check probability, skip subtree if failed.
 */
function traverseMaybe(
	child: Expr,
	prob: number,
	ctx: TraverseContext,
	state: TraversalState,
	outputs: VoiceOutput[],
): void {
	// Generate unique key for this maybe node at this cycle
	const probKey = `${ctx.exprPath}.maybe:${ctx.cycle}`;

	// Check if we've already rolled for this node this cycle
	if (!state.probDecisions.has(probKey)) {
		const pass = Math.random() < prob;
		state.probDecisions.set(probKey, pass);
	}

	const probPass = state.probDecisions.get(probKey)!;

	// If probability failed, skip entire subtree
	if (!probPass) {
		return;
	}

	// Otherwise traverse child normally
	traverseExpr(
		child,
		{
			...ctx,
			exprPath: `${ctx.exprPath}.maybe`,
		},
		state,
		outputs,
	);
}
