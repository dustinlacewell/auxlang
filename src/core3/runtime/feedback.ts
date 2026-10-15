/**
 * Feedback across a swap (MANIFESTO §6.2). A z-edge (`loop()`, `z1`) reads its
 * source's output from the previous sample. The engine keeps that sample in
 * its value buffer, so a new engine would read 0 for one sample. Instead the
 * old engine captures the outputs z-edges read (by migration key, port and
 * lane), and the new engine writes them back for each matched source, through
 * the match (runtime/match.ts). An unmatched source starts at 0. Nothing
 * carries across a sample-rate change, as with state.
 *
 * The values go into the buffer the first tick turns into the previous one.
 */

import type { EngineState, FeedbackValues, KeyedIdentity, PNode } from "../types";
import { type OutputLayout, slotOf } from "./output-slots";

/** One output a z-edge reads: (node, port), with every lane of it. */
export interface FeedbackRead {
	readonly node: number;
	readonly port: string;
}

/** The distinct (node, port) outputs any z-edge in `nodes` reads. */
export function feedbackReads(nodes: readonly PNode[]): FeedbackRead[] {
	const seen = new Map<string, FeedbackRead>();
	for (const node of nodes) {
		for (const lane of node.lanes) {
			for (const src of Object.values(lane)) {
				if (src.k === "z") seen.set(`${src.node}/${src.port}`, { node: src.node, port: src.port });
			}
		}
	}
	return [...seen.values()];
}

/** The read outputs' current values, by migration key, port and lane. */
export function captureFeedback(
	reads: readonly FeedbackRead[],
	identities: readonly KeyedIdentity[],
	layout: OutputLayout,
	buffer: Float64Array,
): FeedbackValues {
	const values: Record<string, Record<string, number[]>> = {};
	for (const { node, port } of reads) {
		const key = (identities[node] as KeyedIdentity).key;
		const lanes = Array.from(
			{ length: layout.laneCounts[node] as number },
			(_, lane) => buffer[slotOf(layout, node, port, lane)] as number,
		);
		values[key] = { ...values[key], [port]: lanes };
	}
	return values;
}

/** Write the previous engine's captured values into `buffer` for each matched source. */
export function restoreFeedback(
	reads: readonly FeedbackRead[],
	paired: ReadonlyMap<number, string>,
	layout: OutputLayout,
	sampleRate: number,
	prev: EngineState | undefined,
	buffer: Float64Array,
): void {
	if (prev === undefined || prev.sampleRate !== sampleRate) return;
	for (const { node, port } of reads) {
		const oldKey = paired.get(node);
		const lanes = oldKey === undefined ? undefined : prev.feedback[oldKey]?.[port];
		if (lanes === undefined) continue;
		const count = Math.min(lanes.length, layout.laneCounts[node] as number);
		for (let lane = 0; lane < count; lane++) {
			buffer[slotOf(layout, node, port, lane)] = lanes[lane] as number;
		}
	}
}
