/**
 * Build pre-compiled input resolvers for scalar inputs.
 */

import { hydrateFunction } from "../../../hydrate-function";
import type { WorkletInput, WorkletSpec } from "../../../worklet-types";
import type { CollectedStates } from "../collected-states";
import { deepCloneState } from "../deep-clone-state";
import type { InputResolver, LambdaFn } from "./types";

export function buildInputResolvers(
	nodeId: string,
	nodeInputs: Record<string, WorkletInput>,
	spec: WorkletSpec,
	oldNodeId: string | undefined,
	oldStates: CollectedStates | undefined,
	nodeIndexById: Map<string, number>,
	nodeOutputs: Record<string, number>[],
	lambdaStates: Map<string, Record<string, unknown>>,
): { names: string[]; resolvers: InputResolver[] } {
	const names: string[] = [];
	const resolvers: InputResolver[] = [];

	for (const [name, input] of Object.entries(nodeInputs)) {
		names.push(name);
		resolvers.push(
			buildSingleResolver(nodeId, name, input, oldNodeId, oldStates, nodeIndexById, nodeOutputs, lambdaStates),
		);
	}

	for (const [name, def] of Object.entries(spec.inputs)) {
		if (!names.includes(name)) {
			names.push(name);
			const value = def.default;
			resolvers.push(() => value);
		}
	}

	return { names, resolvers };
}

function buildSingleResolver(
	nodeId: string,
	inputName: string,
	input: WorkletInput,
	oldNodeId: string | undefined,
	oldStates: CollectedStates | undefined,
	nodeIndexById: Map<string, number>,
	nodeOutputs: Record<string, number>[],
	lambdaStates: Map<string, Record<string, unknown>>,
): InputResolver {
	if (input.type === "constant") {
		const value = input.value;
		return () => value;
	}

	if (input.type === "connection") {
		const srcIdx = nodeIndexById.get(input.nodeId);
		const srcOutput = input.output;
		if (srcIdx !== undefined) {
			return () => nodeOutputs[srcIdx]![srcOutput] ?? 0;
		}
		return () => 0;
	}

	if (input.type === "connectionArray") {
		const first = input.connections[0];
		if (first) {
			const srcIdx = nodeIndexById.get(first.nodeId);
			if (srcIdx !== undefined) {
				const srcOutput = first.output;
				return () => nodeOutputs[srcIdx]![srcOutput] ?? 0;
			}
		}
		return () => 0;
	}

	// Lambda
	const fn = hydrateFunction(input.source) as LambdaFn;
	const lambdaKey = `${nodeId}:${inputName}`;
	const oldLambdaKey = oldNodeId ? `${oldNodeId}:${inputName}` : undefined;

	let lambdaState: Record<string, unknown> = {};
	if (oldLambdaKey && oldStates?.lambdaStates.has(oldLambdaKey)) {
		lambdaState = deepCloneState(oldStates.lambdaStates.get(oldLambdaKey)!);
	}
	lambdaStates.set(lambdaKey, lambdaState);

	return (sr, time) => fn(lambdaState, sr, time);
}
