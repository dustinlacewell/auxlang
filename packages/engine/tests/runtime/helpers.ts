/**
 * Program-literal builders for runtime tests. Tests define their own modules
 * inline (unique, file-prefixed names) and wire hand-built Programs.
 */

import { bindLambdaMath } from "@/dsp/bind-math/bind-lambda-math";
import type { PNode, PortSrc, Program } from "@/types";

/** Tick param shorthands: inline test modules annotate explicitly because the
 * TickFn | ReduceTickFn union defeats contextual parameter typing. */
export type St = Record<string, unknown>;
export type IO = Record<string, number>;

export const c = (v: number): PortSrc => ({ k: "c", v });
export const n = (node: number, port = "out", lane = 0): PortSrc => ({ k: "n", node, port, lane });
export const z = (node: number, port = "out", lane = 0): PortSrc => ({ k: "z", node, port, lane });
export const lam = (src: string): PortSrc => ({ k: "l", lambda: bindLambdaMath(src) });

export function pnode(
	module: string,
	lanes: Record<string, PortSrc>[],
	opts: {
		place?: string;
		upstream?: string;
		pin?: string;
		config?: Record<string, unknown>;
		groups?: Record<string, readonly string[]>;
	} = {},
): PNode {
	const node: PNode = {
		kind: module,
		place: opts.place ?? module,
		upstream: opts.upstream ?? module,
		constants: [],
		module,
		width: lanes.length,
		lanes,
		config: opts.config ?? {},
		...(opts.groups === undefined ? {} : { groups: opts.groups }),
	};
	return opts.pin === undefined ? node : { ...node, pin: opts.pin };
}

export const prog = (nodes: PNode[], outs: number[] = []): Program => ({ nodes, outs, seed: 1 });
