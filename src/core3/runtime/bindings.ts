/**
 * Input binding compilation for map-policy nodes. Each lane's PortSrc record
 * compiles to parallel arrays (kind / buffer offset / constant / lambda slot)
 * so the tick loop fills the reused `ins` record with plain indexed reads —
 * no dispatch objects, no allocation.
 *
 * Kinds: BIND_CONST reads a constant, BIND_CUR reads the current buffer
 * ("n" source, producer already ran this sample), BIND_PREV reads the previous
 * buffer ("z" source, cycle cut), BIND_LAMBDA calls a hydrated user lambda.
 */

import type { ModuleSpec, PNode, PortAnn, PortSrc } from "../types";
import { hydrateLambda, type LambdaSlot } from "./lambda";
import { slotOf, type OutputLayout } from "./output-slots";

export const BIND_CONST = 0;
export const BIND_CUR = 1;
export const BIND_PREV = 2;
export const BIND_LAMBDA = 3;

export interface LaneBindings {
	readonly names: readonly string[];
	readonly kinds: Int8Array;
	readonly offsets: Int32Array;
	readonly consts: Float64Array;
	readonly lambdas: readonly (LambdaSlot | null)[];
}

export function compileLaneBindings(
	node: PNode,
	nodeIndex: number,
	spec: ModuleSpec,
	layout: OutputLayout,
	lane: number,
): LaneBindings {
	const srcs = node.lanes[lane] as Record<string, PortSrc>;
	const names = Object.keys(spec.ins);
	const kinds = new Int8Array(names.length);
	const offsets = new Int32Array(names.length);
	const consts = new Float64Array(names.length);
	const lambdas: (LambdaSlot | null)[] = names.map(() => null);

	names.forEach((name, j) => {
		const src = srcs[name];
		if (src === undefined) {
			const def = (spec.ins[name] as PortAnn).def;
			if (def === null) {
				throw new Error(
					`node #${nodeIndex} ('${node.module}') lane ${lane}: input '${name}' is required but unconnected`,
				);
			}
			kinds[j] = BIND_CONST;
			consts[j] = def;
			return;
		}
		switch (src.k) {
			case "c":
				kinds[j] = BIND_CONST;
				consts[j] = src.v;
				break;
			case "n":
				kinds[j] = BIND_CUR;
				offsets[j] = slotOf(layout, src.node, src.port, src.lane);
				break;
			case "z":
				kinds[j] = BIND_PREV;
				offsets[j] = slotOf(layout, src.node, src.port, src.lane);
				break;
			case "l":
				kinds[j] = BIND_LAMBDA;
				lambdas[j] = hydrateLambda(src.src);
				break;
		}
	});

	return { names, kinds, offsets, consts, lambdas };
}
