/**
 * Collect all note events within a beat, flattened from nested structure.
 *
 * Called once per beat boundary to build the event schedule.
 * Returns events sorted by start time for sample-perfect lookup.
 */

import type { Expr } from "../expr/types";
import { countBeats } from "../expr/traverse";
import { euclidean } from "../expr/euclidean";
import { pitchToFreq } from "../expr/pitch-to-freq";
import type { BeatEvent } from "./types";

type ProbDecisions = Record<string, boolean>;

/**
 * Collect all events within a beat range.
 *
 * @param expr - The expression to search
 * @param beatIndex - Which beat we're collecting for (0-indexed)
 * @param probDecisions - Cached probability decisions
 * @param cycle - Current cycle (for alternation)
 * @returns Array of events sorted by start time
 */
export function collectBeatEvents(
	expr: Expr,
	beatIndex: number,
	probDecisions: ProbDecisions,
	cycle: number,
): BeatEvent[] {
	const totalBeats = countBeats(expr);
	const events: BeatEvent[] = [];

	collectEvents(expr, beatIndex, 0, totalBeats, "root", probDecisions, cycle, events, false);

	// Sort by start time for efficient lookup
	events.sort((a, b) => a.start - b.start);

	return events;
}

/**
 * Recursively collect events, normalizing positions to 0-1 range within the beat.
 *
 * @param inTie - true if we're inside a tie and this is not the first note
 */
function collectEvents(
	expr: Expr,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
	events: BeatEvent[],
	inTie: boolean,
): void {
	// Quick bounds check - does this expr's range overlap with the beat?
	// Beat spans [beatIndex, beatIndex+1), expr spans [beatStart, beatStart+duration)
	const beatEnd = beatStart + duration;
	const beatRangeStart = beatIndex;
	const beatRangeEnd = beatIndex + 1;
	if (beatEnd <= beatRangeStart || beatStart >= beatRangeEnd) {
		return;
	}

	switch (expr.type) {
		case "note": {
			// Normalize to 0-1 within the beat
			const start = Math.max(0, beatStart - beatIndex);
			const end = Math.min(1, beatEnd - beatIndex);
			events.push({
				freq: pitchToFreq(expr.pitch),
				start,
				end,
				isTrigger: !inTie,
			});
			break;
		}

		case "rest":
			// Rests produce no events
			break;

		case "seq":
			collectSeq(expr.children, beatIndex, beatStart, duration, pathKey, probDecisions, cycle, events, inTie);
			break;

		case "group":
			collectGroup(expr.children, beatIndex, beatStart, duration, pathKey, probDecisions, cycle, events, inTie);
			break;

		case "alt": {
			if (expr.children.length === 0) break;
			const selected = cycle % expr.children.length;
			const child = expr.children[selected]!;
			collectEvents(child, beatIndex, beatStart, duration, `${pathKey}.alt${selected}`, probDecisions, cycle, events, inTie);
			break;
		}

		case "stack":
			// For mono patterns, stack should have been eliminated by projectVoice
			// If we hit one, just take the first child
			if (expr.children[0]) {
				collectEvents(expr.children[0], beatIndex, beatStart, duration, `${pathKey}.stack0`, probDecisions, cycle, events, inTie);
			}
			break;

		case "tie":
			collectTie(expr.children, beatIndex, beatStart, duration, pathKey, probDecisions, cycle, events, inTie);
			break;

		case "multiply":
			collectMultiply(expr.child, expr.count, beatIndex, beatStart, duration, pathKey, probDecisions, cycle, events, inTie);
			break;

		case "replicate":
			collectReplicate(expr.child, expr.count, beatIndex, beatStart, duration, pathKey, probDecisions, cycle, events, inTie);
			break;

		case "elongate":
			collectEvents(expr.child, beatIndex, beatStart, duration, `${pathKey}.elong`, probDecisions, cycle, events, inTie);
			break;

		case "euclidean":
			collectEuclidean(expr.child, expr.hits, expr.steps, beatIndex, beatStart, duration, pathKey, probDecisions, cycle, events, inTie);
			break;

		case "maybe": {
			const probKey = `${pathKey}.maybe:${cycle}`;
			if (!(probKey in probDecisions)) {
				probDecisions[probKey] = Math.random() < expr.prob;
			}
			if (!probDecisions[probKey]) {
				break;
			}
			collectEvents(expr.child, beatIndex, beatStart, duration, `${pathKey}.maybe`, probDecisions, cycle, events, inTie);
			break;
		}
	}
}

function collectSeq(
	children: Expr[],
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
	events: BeatEvent[],
	inTie: boolean,
): void {
	const totalChildBeats = children.reduce((sum, child) => sum + countBeats(child), 0);
	if (totalChildBeats === 0) return;

	const beatScale = duration / totalChildBeats;
	let currentBeat = beatStart;

	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childBeats = countBeats(child);
		const childDuration = childBeats * beatScale;

		collectEvents(child, beatIndex, currentBeat, childDuration, `${pathKey}.seq${i}`, probDecisions, cycle, events, inTie);

		currentBeat += childDuration;
	}
}

function collectGroup(
	children: Expr[],
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
	events: BeatEvent[],
	inTie: boolean,
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

		collectEvents(child, beatIndex, currentBeat, childDuration, `${pathKey}.grp${i}`, probDecisions, cycle, events, inTie);

		currentBeat += childDuration;
	}
}

function collectTie(
	children: Expr[],
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
	events: BeatEvent[],
	inTie: boolean,
): void {
	if (children.length === 0) return;

	const childDuration = duration / children.length;
	let currentBeat = beatStart;

	// For ties: first child triggers (unless already in a tie), subsequent children don't
	for (let i = 0; i < children.length; i++) {
		const child = children[i]!;
		const childInTie = inTie || i > 0; // First child inherits parent's inTie, rest are tied

		collectEvents(child, beatIndex, currentBeat, childDuration, `${pathKey}.tie${i}`, probDecisions, cycle, events, childInTie);

		currentBeat += childDuration;
	}
}

function collectMultiply(
	child: Expr,
	count: number,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
	events: BeatEvent[],
	inTie: boolean,
): void {
	if (count <= 0) return;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		collectEvents(child, beatIndex, beatStart + i * repDuration, repDuration, `${pathKey}.mult${i}`, probDecisions, cycle, events, inTie);
	}
}

function collectReplicate(
	child: Expr,
	count: number,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
	events: BeatEvent[],
	inTie: boolean,
): void {
	if (count <= 0) return;

	const repDuration = duration / count;

	for (let i = 0; i < count; i++) {
		collectEvents(child, beatIndex, beatStart + i * repDuration, repDuration, `${pathKey}.rep${i}`, probDecisions, cycle, events, inTie);
	}
}

function collectEuclidean(
	child: Expr,
	hits: number,
	steps: number,
	beatIndex: number,
	beatStart: number,
	duration: number,
	pathKey: string,
	probDecisions: ProbDecisions,
	cycle: number,
	events: BeatEvent[],
	inTie: boolean,
): void {
	const pattern = euclidean(hits, steps);
	const stepDuration = duration / steps;

	for (let i = 0; i < steps; i++) {
		if (pattern[i]) {
			collectEvents(child, beatIndex, beatStart + i * stepDuration, stepDuration, `${pathKey}.euc${i}`, probDecisions, cycle, events, inTie);
		}
	}
}
