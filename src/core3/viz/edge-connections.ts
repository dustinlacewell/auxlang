/**
 * The distinct port-level connections behind one drawn edge (from → to).
 * program-to-dot collapses parallel port wires between two nodes into a single
 * arrow; hover UIs expand them back out. Poly lanes repeat the same wiring per
 * voice, so connections are deduped.
 */

import type { PortSrc, Program } from "../types";

export interface EdgeConnection {
	readonly fromPort: string;
	readonly toPort: string;
	readonly feedback: boolean;
}

export function edgeConnections(program: Program, from: number, to: number): EdgeConnection[] {
	const node = program.nodes[to];
	if (!node) return [];
	const seen = new Map<string, EdgeConnection>();
	for (const lane of node.lanes) {
		for (const [toPort, src] of Object.entries(lane) as [string, PortSrc][]) {
			if (src.k !== "n" && src.k !== "z") continue;
			if (src.node !== from) continue;
			const key = `${src.port}>${toPort}:${src.k}`;
			if (!seen.has(key)) {
				seen.set(key, { fromPort: src.port, toPort, feedback: src.k === "z" });
			}
		}
	}
	return [...seen.values()];
}
