/**
 * Input gather compilation for reduce-policy nodes. A reduce node has one
 * lane record but sees ALL lanes of each connected source port at once: per
 * port the engine keeps a preallocated Float32Array view of `width` lanes
 * (width = max connected source width) and refills it each sample from the
 * current ("n") or previous ("z") buffer, broadcasting narrower sources by
 * lane % srcLanes. Constants stay plain numbers; lambdas are evaluated to a
 * number each sample — matching ReduceTickFn's `Float32Array | number` ins.
 */

import type { ModuleSpec, PNode, PortAnn, PortSrc } from "../types";
import { hydrateLambda, type LambdaSlot } from "./lambda";
import { slotOf, type OutputLayout } from "./output-slots";

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
	/** Preallocated lane view (length = ReduceGathers.width); null for const/lambda. */
	readonly view: Float32Array | null;
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
			const def = (spec.ins[name] as PortAnn).def;
			if (def === null) {
				throw new Error(
					`node #${nodeIndex} ('${node.module}'): input '${name}' is required but unconnected`,
				);
			}
			return { name, kind: GATHER_CONST, constValue: def, base: 0, srcLanes: 1, lambda: null };
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
				return { name, kind: GATHER_LAMBDA, constValue: 0, base: 0, srcLanes: 1, lambda: hydrateLambda(src.src) };
		}
	});

	const width = Math.max(1, ...partials.filter((p) => p.kind === GATHER_CUR || p.kind === GATHER_PREV).map((p) => p.srcLanes));
	const ports = partials.map((p) => ({
		...p,
		view: p.kind === GATHER_CUR || p.kind === GATHER_PREV ? new Float32Array(width) : null,
	}));
	return { width, ports };
}
