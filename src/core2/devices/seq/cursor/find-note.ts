/**
 * Find the active note at a given beat position.
 *
 * This is called once per beat (not per sample) to find which note
 * is playing at the given beat index.
 */

import type { Expr } from "../expr/types";
import { countBeats } from "../expr/count-beats";
import { euclidean } from "../expr/euclidean";
import { pitchToFreq } from "../expr/pitch-to-freq";

/**
 * Result of finding a note - includes timing info for gate/trig.
 */
export interface NoteResult {
	freq: number;
	duration: number; // in beats (for gate timing within beat)
	beatStart: number; // absolute beat where this note starts
	pathKey: string; // for probability caching
}

/** Plain object for probability decisions (serializable across worklet boundary) */
type ProbDecisions = Record<string, boolean>;

/**
 * Find the note playing at a given beat position.
 *
 * @param expr - The expression to search
 * @param beatIndex - Which beat we're looking for (0-indexed)
 * @param beatStart - Beat offset of this expr
 * @param duration - Duration allocated to this expr (in beats)
 * @param pathKey - Path for probability caching
 * @param probDecisions - Cached probability decisions
 * @param cycle - Current cycle (for alternation)
 * @returns Note info if found, null if rest or outside range
 */
export function findNoteAtBeat(
	expr: Expr,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
): NoteResult | null {
	// Quick bounds check - is beatIndex within this expr's range?
	const beatEnd = beatStart + duration;
	if (beatIndex < beatStart || beatIndex >= beatEnd) {
		return null;
	}

	switch (expr.type) {
		case "note":
			return {
				freq: pitchToFreq(expr.pitch),
				duration,
				beatStart,
				pathKey,
			};

		case "rest":
			return null;

		case "seq":
			return findInSequence(expr.children, beatIndex, beatStart, duration, pathKey, probDecisions, cycle);

		case "group":
			return findInGroup(expr.children, beatIndex, beatStart, duration, pathKey, probDecisions, cycle);

		case "alt": {
			if (expr.children.length === 0) return null;
			const selected = cycle % expr.children.length;
			const child = expr.children[selected]!;
			return findNoteAtBeat(child, beatIndex, beatStart, duration, `${pathKey}.alt${selected}`, probDecisions, cycle);
		}

		case "stack":
			// For mono patterns, stack should have been eliminated by projectVoice
			// If we hit one, just take the first child
			return expr.children[0]
				? findNoteAtBeat(expr.children[0], beatIndex, beatStart, duration, `${pathKey}.stack0`, probDecisions, cycle)
				: null;

		case "tie":
			return findInTie(expr.children, beatIndex, beatStart, duration, pathKey, probDecisions, cycle);

		case "multiply":
			return findInMultiply(expr.child, expr.count, beatIndex, beatStart, duration, pathKey, probDecisions, cycle);

		case "replicate":
			return findInReplicate(expr.child, expr.count, beatIndex, beatStart, duration, pathKey, probDecisions, cycle);

		case "elongate":
			return findNoteAtBeat(expr.child, beatIndex, beatStart, duration, `${pathKey}.elong`, probDecisions, cycle);

		case "euclidean":
			return findInEuclidean(
				expr.child,
				expr.hits,
				expr.steps,
				beatIndex,
				beatStart,
				duration,
				pathKey,
				probDecisions,
				cycle,
			);

		case "maybe": {
			const probKey = `${pathKey}.maybe:${cycle}`;
			if (!(probKey in probDecisions)) {
				probDecisions[probKey] = Math.random() < expr.prob;
			}
			if (!probDecisions[probKey]) {
				return null;
			}
			return findNoteAtBeat(expr.child, beatIndex, beatStart, duration, `${pathKey}.maybe`, probDecisions, cycle);
		}
	}
}

/**
 * Find note in a sequence - children laid out sequentially.
 */
function findInSequence(
	children: Expr[],
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
): NoteResult | null {
	const totalChildBeats = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalChildBeats === 0) return null;

	const beatScale = duration / totalChildBeats;
	let currentBeat = beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childBeats = countBeats(child);
		const childDuration = childBeats * beatScale;

		const result = findNoteAtBeat(
			child,
			beatIndex,
			currentBeat,
			childDuration,
			`${pathKey}.seq${i}`,
			probDecisions,
			cycle,
		);
		if (result) return result;

		currentBeat += childDuration;
	}

	return null;
}

/**
 * Find note in a group - children subdivide duration by weight.
 */
function findInGroup(
	children: Expr[],
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
): NoteResult | null {
	if (children.length === 0) return null;

	const totalWeight = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalWeight === 0) return null;

	const beatScale = duration / totalWeight;
	let currentBeat = beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childWeight = countBeats(child);
		const childDuration = childWeight * beatScale;

		const result = findNoteAtBeat(
			child,
			beatIndex,
			currentBeat,
			childDuration,
			`${pathKey}.grp${i}`,
			probDecisions,
			cycle,
		);
		if (result) return result;

		currentBeat += childDuration;
	}

	return null;
}

/**
 * Find note in a tie - sequential children, gate held.
 */
function findInTie(
	children: Expr[],
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
): NoteResult | null {
	if (children.length === 0) return null;

	const childDuration = duration / children.length;
	let currentBeat = beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;

		const result = findNoteAtBeat(
			child,
			beatIndex,
			currentBeat,
			childDuration,
			`${pathKey}.tie${i}`,
			probDecisions,
			cycle,
		);
		if (result) {
			// Tie extends gate to full tie duration
			return { ...result, duration };
		}

		currentBeat += childDuration;
	}

	return null;
}

/**
 * Find note in multiply - child repeated n times within duration.
 */
function findInMultiply(
	child: Expr,
	count: number,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
): NoteResult | null {
	if (count <= 0) return null;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		const result = findNoteAtBeat(
			child,
			beatIndex,
			beatStart + i * repDuration,
			repDuration,
			`${pathKey}.mult${i}`,
			probDecisions,
			cycle,
		);
		if (result) return result;
	}

	return null;
}

/**
 * Find note in replicate - child repeated n times sequentially.
 */
function findInReplicate(
	child: Expr,
	count: number,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
): NoteResult | null {
	if (count <= 0) return null;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		const result = findNoteAtBeat(
			child,
			beatIndex,
			beatStart + i * repDuration,
			repDuration,
			`${pathKey}.rep${i}`,
			probDecisions,
			cycle,
		);
		if (result) return result;
	}

	return null;
}

/**
 * Find note in euclidean - child distributed across k of n steps.
 */
function findInEuclidean(
	child: Expr,
	hits: number,
	steps: number,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
): NoteResult | null {
	const pattern = euclidean(hits, steps);
	const stepDuration = duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			const result = findNoteAtBeat(
				child,
				beatIndex,
				beatStart + i * stepDuration,
				stepDuration,
				`${pathKey}.euc${i}`,
				probDecisions,
				cycle,
			);
			if (result) return result;
		}
	}

	return null;
}
