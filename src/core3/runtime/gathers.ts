/**
 * Input gather compilation for reduce-policy nodes. A reduce node has one
 * lane record but sees ALL lanes of each connected source port at once: per
 * port the engine keeps a preallocated Float64Array view of that source's own
 * lanes and refills it each sample from the current ("n") or previous ("z")
 * buffer — the same precision as the engine's own f64 sample buffers, so a
 * reducer sums undegraded values. A narrower source is NOT copied across a
 * wider one's lanes: a reducer sums what it is given, so a width-1 jack beside
 * a 4-lane jack counts once, not four times. `width` (passed to the tick) is
 * the widest connected source. Constants stay plain numbers; lambdas are
 * evaluated to a number each sample — matching ReduceTickFn's
 * `Float64Array | number` ins.
 */

import type { ModuleSpec, PNode, PortAnn, PortSrc } from "../types";
import { type LambdaSlot, hydrateLambda } from "./lambda";
import { type OutputLayout, slotOf } from "./output-slots";

export const GATHER_CONST = 0;
export const GATHER_CUR = 1;
export const GATHER_PREV = 2;
export const GATHER_LAMBDA = 3;

export interface PortGather {
	readonly name: string;
	readonly kind: number;
	readonly constValue: number;
	/** Slot of (srcNode, port, lane 0); lanes are contiguous from here. */
	readonly base: number;
	readonly srcLanes: number;
	/** Preallocated lane view (length = srcLanes, the source's own width); null for const/lambda. */
	readonly view: Float64Array | null;
	readonly lambda: LambdaSlot | null;
}

export interface ReduceGathers {
	/** Lane count the reducer collapses — passed to ReduceTickFn as `width`. */
	readonly width: number;
	readonly ports: readonly PortGather[];
}

export function compileReduceGathers(
	node: PNode,
	nodeIndex: number,
	spec: ModuleSpec,
	layout: OutputLayout,
): ReduceGathers {
	const srcs = node.lanes[0] as Record<string, PortSrc>;
	const names = Object.keys(spec.ins);

	interface Partial {
		name: string;
		kind: number;
		constValue: number;
		base: number;
		srcLanes: number;
		lambda: LambdaSlot | null;
	}

	const partials: Partial[] = names.map((name) => {
		const src = srcs[name];
		if (src === undefined) {
			const ann = spec.ins[name] as PortAnn;
			if (ann.def === null && !ann.opt) {
				throw new Error(
					`node #${nodeIndex} ('${node.module}'): input '${name}' is required but unconnected`,
				);
			}
			// Optional (`opt`) unconnected gathers NaN — the "absent" sentinel.
			return {
				name,
				kind: GATHER_CONST,
				constValue: ann.def ?? Number.NaN,
				base: 0,
				srcLanes: 1,
				lambda: null,
			};
		}
		switch (src.k) {
			case "c":
				return { name, kind: GATHER_CONST, constValue: src.v, base: 0, srcLanes: 1, lambda: null };
			case "n":
			case "z":
				return {
					name,
					kind: src.k === "n" ? GATHER_CUR : GATHER_PREV,
					constValue: 0,
					base: slotOf(layout, src.node, src.port, 0),
					srcLanes: layout.laneCounts[src.node] as number,
					lambda: null,
				};
			case "l":
				return {
					name,
					kind: GATHER_LAMBDA,
					constValue: 0,
					base: 0,
					srcLanes: 1,
					lambda: hydrateLambda(src.lambda),
				};
		}
	});

	const width = Math.max(
		1,
		...partials
			.filter((p) => p.kind === GATHER_CUR || p.kind === GATHER_PREV)
			.map((p) => p.srcLanes),
	);
	const ports = partials.map((p) => ({
		...p,
		view: p.kind === GATHER_CUR || p.kind === GATHER_PREV ? new Float64Array(p.srcLanes) : null,
	}));
	return { width, ports };
}
