/**
 * What a WASM engine is, apart from its code and memory, as plain data: the
 * identities its state is keyed by, the old keys its nodes take state from
 * (reeval-identities.ts), each node's seed (a changed seed keeps the fresh
 * random stream), each table node's table key (an unchanged key keeps the
 * tables), the outputs z-edges read and the value slots they sit in,
 * the rate, and the live slots' sites. A hand-over plans its carry from two of these
 * (carry-plan.ts); `collectState` names what it reads by them.
 */

import { tableKey } from "../../bridge/table-key";
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
	/** Each node's table key (bridge/table-key.ts) when its module reads a pattern, else null. */
	readonly tables: readonly (string | null)[];
	readonly feedback: readonly FeedbackRead[];
	readonly outputs: OutputLayout;
	readonly sampleRate: number;
	/** Each live slot's site (Program.liveSlots order): a swap carries a slot by site. */
	readonly slotSites: readonly number[];
}

/** `readsPattern`: per node, whether its module reads a pattern (and so holds tables). */
export function engineFacts(parts: EngineParts, readsPattern: readonly boolean[]): EngineFacts {
	return {
		identities: parts.identities,
		paired: [...parts.paired],
		seeds: parts.runs.map((run) => Number(run.states[0]?.__seed ?? Number.NaN)),
		tables: parts.runs.map((run, i) => (readsPattern[i] === true ? tableKey(run.config) : null)),
		feedback: parts.feedback,
		outputs: parts.layout,
		sampleRate: parts.sampleRate,
		slotSites: parts.liveSlots.map((slot) => slot.site),
	};
}
