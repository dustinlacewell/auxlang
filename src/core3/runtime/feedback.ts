/**
 * Feedback across a swap (MANIFESTO §6.2). A z-edge (`loop()`, `z1`) reads its
 * source's output from the previous sample. The engine keeps that sample in
 * its value buffer, so a new engine would read 0 for one sample. Instead the
 * old engine captures the outputs z-edges read (by migration key, port and
 * lane), and the new engine writes them back for each matched source, through
 * the match (runtime/match.ts). Nothing carries across a sample-rate change,
 * as with state.
 *
 * A source with nothing carried (a fresh patch, a new wire, a new lane) starts
 * at its z-edge's declared start value (`loop` init, PortSrc `start`), else 0.
 * Two z-edges that read one output with different start values are a loud
 * error: the output has one previous sample.
 *
 * The values go into the buffer the first tick turns into the previous one.
 */

import type { EngineState, FeedbackValues, KeyedIdentity, PNode } from "../types";
import { type OutputLayout, slotOf } from "./output-slots";

/** One output a z-edge reads: (node, port), with every lane of it, and its start value. */
export interface FeedbackRead {
	readonly node: number;
	readonly port: string;
	readonly start: number;
}

/** The distinct (node, port) outputs any z-edge in `nodes` reads. */
export function feedbackReads(nodes: readonly PNode[]): FeedbackRead[] {
	const seen = new Map<string, FeedbackRead>();
	for (const node of nodes) {
		for (const lane of node.lanes) {
			for (const src of Object.values(lane)) {
				if (src.k !== "z") continue;
				const read = { node: src.node, port: src.port, start: src.start ?? 0 };
				assertOneStart(seen.get(`${src.node}/${src.port}`), read);
				seen.set(`${src.node}/${src.port}`, read);
			}
		}
	}
	return [...seen.values()];
}

function assertOneStart(known: FeedbackRead | undefined, read: FeedbackRead): void {
	if (known === undefined || known.start === read.start) return;
	throw new Error(
		`node #${read.node}.${read.port} is fed back with two start values (${known.start}, ${read.start}). An output has one previous sample, so give every loop that reads it the same init.`,
	);
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

/** Write each read's previous sample into `buffer`: the carried value for a matched source, else its start. */
export function restoreFeedback(
	reads: readonly FeedbackRead[],
	paired: ReadonlyMap<number, string>,
	layout: OutputLayout,
	sampleRate: number,
	prev: EngineState | undefined,
	buffer: Float64Array,
): void {
	const carries = prev !== undefined && prev.sampleRate === sampleRate;
	for (const { node, port, start } of reads) {
		const oldKey = paired.get(node);
		const lanes = !carries || oldKey === undefined ? undefined : prev.feedback[oldKey]?.[port];
		const count = layout.laneCounts[node] as number;
		for (let lane = 0; lane < count; lane++) {
			buffer[slotOf(layout, node, port, lane)] = lanes?.[lane] ?? start;
		}
	}
}
