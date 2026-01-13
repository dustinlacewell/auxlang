/**
 * Build pre-compiled array resolvers for processAll inputs.
 */

import type { WorkletInput, WorkletSpec } from "../../../worklet-types";
import type { ArrayResolver } from "./types";

export function buildArrayResolvers(
	nodeInputs: Record<string, WorkletInput>,
	spec: WorkletSpec,
	nodeIndexById: Map<string, number>,
	nodeOutputs: Record<string, number>[],
): { names: string[]; resolvers: ArrayResolver[] } {
	const names: string[] = [];
	const resolvers: ArrayResolver[] = [];

	for (const [name, input] of Object.entries(nodeInputs)) {
		names.push(name);
		resolvers.push(buildSingleResolver(input, nodeIndexById, nodeOutputs));
	}

	for (const [name, def] of Object.entries(spec.inputs)) {
		if (!names.includes(name)) {
			names.push(name);
			const arr = [def.default];
			resolvers.push(() => arr);
		}
	}

	return { names, resolvers };
}

function buildSingleResolver(
	input: WorkletInput,
	nodeIndexById: Map<string, number>,
	nodeOutputs: Record<string, number>[],
): ArrayResolver {
	if (input.type === "constant") {
		const arr = [input.value];
		return () => arr;
	}

	if (input.type === "connection") {
		const srcIdx = nodeIndexById.get(input.nodeId);
		const srcOutput = input.output;
		if (srcIdx !== undefined) {
			return () => [nodeOutputs[srcIdx]![srcOutput] ?? 0];
		}
		return () => [0];
	}

	if (input.type === "connectionArray") {
		const connections = input.connections.map((c) => ({
			idx: nodeIndexById.get(c.nodeId),
			output: c.output,
		}));
		return () => {
			const result: number[] = [];
			for (const conn of connections) {
				if (conn.idx !== undefined) {
					result.push(nodeOutputs[conn.idx]![conn.output] ?? 0);
				} else {
					result.push(0);
				}
			}
			return result;
		};
	}

	// Lambda - not supported in array context
	return () => [0];
}
