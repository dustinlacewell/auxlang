/**
 * Sequencer traversal utilities for the worklet context.
 * These are attached to globalThis.seqTraverse for use by seq device process functions.
 */

import { euclidean } from "../../devices/seq/expr/euclidean";
import { pitchToFreq } from "../../devices/seq/expr/pitch-to-freq";

type PS = Array<{ id: number; value: number }>;
type Expr = any; // Full type would be imported but keeping it simple for worklet

interface TimeContext {
	beatIndex: number;
	phase: number;
	cycle: number;
	totalBeats: number;
}

interface TraversalState {
	probDecisions: Map<string, boolean>;
	voiceCV: Map<number, number>;
	lastEventId: Map<number, string>;
}

interface SeqOutput {
	cv: PS;
	gate: PS;
	trig: PS;
}

interface TraverseContext {
	absoluteTime: number;
	beatStart: number;
	duration: number;
	voiceOffset: number;
	cycle: number;
	inTie: boolean;
	exprPath: string;
}

interface VoiceOutput {
	voiceId: number;
	freq: number;
	gate: number;
	trig: number;
}

function createTraversalState(): TraversalState {
	return {
		probDecisions: new Map(),
		voiceCV: new Map(),
		lastEventId: new Map(),
	};
}

function clearProbDecisions(state: TraversalState): void {
	state.probDecisions.clear();
}

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
			return expr.children.reduce((sum: number, child: Expr) => sum + countBeats(child), 0);
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
		default:
			return 1;
	}
}

function voiceCount(expr: Expr): number {
	switch (expr.type) {
		case "stack":
			return expr.children.reduce((sum: number, child: Expr) => sum + voiceCount(child), 0);
		case "seq":
		case "group":
		case "alt":
			return expr.children.reduce((max: number, child: Expr) => Math.max(max, voiceCount(child)), 1);
		case "multiply":
		case "replicate":
		case "elongate":
		case "euclidean":
		case "maybe":
			return voiceCount(expr.child);
		case "tie":
			return expr.children[0] ? voiceCount(expr.children[0]) : 1;
		default:
			return 1;
	}
}

function traverse(expr: Expr, time: TimeContext, state: TraversalState): SeqOutput {
	const voices = voiceCount(expr);
	const totalBeats = countBeats(expr);
	
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

	const outputs: VoiceOutput[] = [];
	traverseExpr(expr, ctx, state, outputs);

	const cv: PS = [];
	const gate: PS = [];
	const trig: PS = [];

	for (let i = 0; i < voices; i++) {
		const output = outputs.find(o => o.voiceId === i);
		if (output) {
			state.voiceCV.set(i, output.freq);
			cv.push({ id: i, value: output.freq });
			gate.push({ id: i, value: output.gate });
			trig.push({ id: i, value: output.trig });
		} else {
			const lastCV = state.voiceCV.get(i) ?? 0;
			cv.push({ id: i, value: lastCV });
			gate.push({ id: i, value: 0 });
			trig.push({ id: i, value: 0 });
		}
	}

	return { cv, gate, trig };
}

function traverseExpr(expr: Expr, ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	switch (expr.type) {
		case "note":
			traverseNote(expr.pitch, ctx, state, outputs);
			break;
		case "rest":
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

function traverseNote(pitch: string, ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	if (ctx.absoluteTime < ctx.beatStart || ctx.absoluteTime >= ctx.beatStart + ctx.duration) {
		return;
	}

	const freq = pitchToFreq(pitch);
	const voiceId = ctx.voiceOffset;

	state.voiceCV.set(voiceId, freq);

	const timeInEvent = ctx.absoluteTime - ctx.beatStart;
	const eventPhase = timeInEvent / ctx.duration;
	const gate = ctx.inTie ? 1 : (eventPhase < 0.8 ? 1 : 0);

	const eventId = `${ctx.exprPath}:${ctx.beatStart}:${ctx.cycle}`;
	const lastId = state.lastEventId.get(voiceId);
	const trig = lastId !== eventId ? 1 : 0;
	state.lastEventId.set(voiceId, eventId);

	outputs.push({ voiceId, freq, gate, trig });
}

function traverseSeq(children: Expr[], ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	const totalChildBeats = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalChildBeats === 0) return;

	const beatScale = ctx.duration / totalChildBeats;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childBeats = countBeats(child);
		const childDuration = childBeats * beatScale;

		traverseExpr(child, { ...ctx, beatStart: currentBeat, duration: childDuration, exprPath: `${ctx.exprPath}.seq[${i}]` }, state, outputs);
		currentBeat += childDuration;
	}
}

function traverseGroup(children: Expr[], ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	if (children.length === 0) return;

	const childDuration = ctx.duration / children.length;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		traverseExpr(child, { ...ctx, beatStart: currentBeat, duration: childDuration, exprPath: `${ctx.exprPath}.group[${i}]` }, state, outputs);
		currentBeat += childDuration;
	}
}

function traverseAlt(children: Expr[], ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	if (children.length === 0) return;

	const selectedIndex = ctx.cycle % children.length;
	const child = children[selectedIndex]!;

	traverseExpr(child, { ...ctx, exprPath: `${ctx.exprPath}.alt[${selectedIndex}]` }, state, outputs);
}

function traverseStack(children: Expr[], ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	let voiceOffset = ctx.voiceOffset;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childVoices = voiceCount(child);

		traverseExpr(child, { ...ctx, voiceOffset, exprPath: `${ctx.exprPath}.stack[${i}]` }, state, outputs);
		voiceOffset += childVoices;
	}
}

function traverseTie(children: Expr[], ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	if (children.length === 0) return;

	const childDuration = ctx.duration / children.length;
	let currentBeat = ctx.beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		traverseExpr(child, { ...ctx, beatStart: currentBeat, duration: childDuration, inTie: true, exprPath: `${ctx.exprPath}.tie[${i}]` }, state, outputs);
		currentBeat += childDuration;
	}
}

function traverseMultiply(child: Expr, count: number, ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	if (count <= 0) return;

	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(child, { ...ctx, beatStart: ctx.beatStart + i * repDuration, duration: repDuration, exprPath: `${ctx.exprPath}.mult[${i}]` }, state, outputs);
	}
}

function traverseReplicate(child: Expr, count: number, ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	if (count <= 0) return;

	const repDuration = ctx.duration / count;

	for (let i = 0; i < count; i++) {
		traverseExpr(child, { ...ctx, beatStart: ctx.beatStart + i * repDuration, duration: repDuration, exprPath: `${ctx.exprPath}.rep[${i}]` }, state, outputs);
	}
}

function traverseElongate(child: Expr, count: number, ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	traverseExpr(child, { ...ctx, exprPath: `${ctx.exprPath}.elong` }, state, outputs);
}

function traverseEuclidean(child: Expr, hits: number, steps: number, ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	const pattern = euclidean(hits, steps);
	const stepDuration = ctx.duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			traverseExpr(child, { ...ctx, beatStart: ctx.beatStart + i * stepDuration, duration: stepDuration, exprPath: `${ctx.exprPath}.euc[${i}]` }, state, outputs);
		}
	}
}

function traverseMaybe(child: Expr, prob: number, ctx: TraverseContext, state: TraversalState, outputs: VoiceOutput[]): void {
	const probKey = `${ctx.exprPath}.maybe:${ctx.cycle}`;

	if (!state.probDecisions.has(probKey)) {
		const pass = Math.random() < prob;
		state.probDecisions.set(probKey, pass);
	}

	const probPass = state.probDecisions.get(probKey)!;

	if (!probPass) {
		return;
	}

	traverseExpr(child, { ...ctx, exprPath: `${ctx.exprPath}.maybe` }, state, outputs);
}

// Attach to globalThis as a side effect
// biome-ignore lint/suspicious/noExplicitAny: worklet global injection
(globalThis as any).seqTraverse = {
	createTraversalState,
	clearProbDecisions,
	countBeats,
	voiceCount,
	traverse,
};
