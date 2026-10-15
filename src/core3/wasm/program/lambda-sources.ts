/**
 * The signal lambdas of a program's nodes, as the engine gets them: per
 * node, per lane (one lane for a reducer, as `PNode.lanes`), input port →
 * bound lambda source.
 */

import type { PNode } from "../../types";

export type LambdaSources = readonly (readonly Readonly<Record<string, string>>[])[];

export function lambdaSources(nodes: readonly PNode[]): LambdaSources {
	return nodes.map((node) =>
		node.lanes.map((srcs) => {
			const lambdas: Record<string, string> = {};
			for (const [port, src] of Object.entries(srcs)) if (src.k === "l") lambdas[port] = src.src;
			return lambdas;
		}),
	);
}
