/**
 * What a WASM engine is, apart from its code and memory, as plain data: the
 * identities its state is keyed by, the old keys its nodes take state from
 * (reeval-identities.ts), each node's seed (a changed seed keeps the fresh
 * random stream), the outputs z-edges read and the value slots they sit in,
 * and the rate. A hand-over plans its carry from two of these
 * (carry-plan.ts); `collectState` names what it reads by them.
 */

import type { EngineParts } from "../../runtime/engine-parts";
import type { FeedbackRead } from "../../runtime/feedback";
import type { OutputLayout } from "../../runtime/output-slots";
import type { KeyedIdentity } from "../../types";

export interface EngineFacts {
	readonly identities: readonly KeyedIdentity[];
	/** [new node index, old key] for each node that takes over running state. */
	readonly paired: readonly (readonly [number, string])[];
	/** Each node's seed (`__seed`, the same on every lane); NaN for a node with no lanes. */
	readonly seeds: readonly number[];
	readonly feedback: readonly FeedbackRead[];
	readonly outputs: OutputLayout;
	readonly sampleRate: number;
}

export function engineFacts(parts: EngineParts): EngineFacts {
	return {
		identities: parts.identities,
		paired: [...parts.paired],
		seeds: parts.runs.map((run) => Number(run.states[0]?.__seed ?? Number.NaN)),
		feedback: parts.feedback,
		outputs: parts.layout,
		sampleRate: parts.sampleRate,
	};
}
