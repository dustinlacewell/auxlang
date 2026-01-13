/**
 * Build a runtime node from worklet graph data.
 */

import type { CollectedStates } from "../collected-states";
import { deepCloneState } from "../deep-clone-state";
import { createInputArrayObject, createInputObject, createOutputObject } from "./allocate-objects";
import { buildArrayResolvers } from "./array-resolvers";
import { buildConfigGetters } from "./config-getters";
import { hydrateProcessFn } from "./hydrate-process";
import { buildInputResolvers } from "./input-resolvers";
import type { ArrayResolver, BuildNodeContext, InputResolver, RuntimeNode } from "./types";

export function buildRuntimeNode(ctx: BuildNodeContext): RuntimeNode {
	const { node, spec, wasmInstance, oldNodeId, oldStates, nodeIndexById, nodeOutputs } = ctx;

	const state = restoreState(oldNodeId, oldStates);
	const { process, processAll } = hydrateProcessFn(spec, wasmInstance);

	const inputs = createInputObject(spec);
	const inputArrays = createInputArrayObject(spec);
	const outputs = createOutputObject(spec);
	const config: Record<string, unknown> = {};

	const configGetters = buildConfigGetters(node.config);
	const lambdaStates = new Map<string, Record<string, unknown>>();

	const { names: inputNames, resolvers: inputResolvers } = buildInputResolvers(
		node.id,
		node.inputs,
		spec,
		oldNodeId,
		oldStates,
		nodeIndexById,
		nodeOutputs,
		lambdaStates,
	);

	const { names: arrayNames, resolvers: arrayResolvers } = buildArrayResolvers(
		node.inputs,
		spec,
		nodeIndexById,
		nodeOutputs,
	);

	const resolveInputs = createResolveInputs(inputs, inputNames, inputResolvers, config, configGetters);
	const resolveInputArrays = createResolveInputArrays(inputArrays, arrayNames, arrayResolvers, config, configGetters);

	return {
		id: node.id,
		process,
		processAll,
		inputs,
		inputArrays,
		config,
		state,
		outputs,
		resolveInputs,
		resolveInputArrays,
		lambdaStates,
	};
}

function restoreState(
	oldNodeId: string | undefined,
	oldStates: CollectedStates | undefined,
): Record<string, unknown> {
	if (oldNodeId && oldStates?.nodeStates.has(oldNodeId)) {
		return deepCloneState(oldStates.nodeStates.get(oldNodeId)!);
	}
	return {};
}

function createResolveInputs(
	inputs: Record<string, number>,
	names: string[],
	resolvers: InputResolver[],
	config: Record<string, unknown>,
	configGetters: { keys: string[]; getters: (() => unknown)[] },
): (sr: number, time: number) => void {
	const { keys, getters } = configGetters;

	return (sr, time) => {
		for (let i = 0; i < names.length; i++) {
			inputs[names[i]!] = resolvers[i]!(sr, time);
		}
		for (let i = 0; i < keys.length; i++) {
			config[keys[i]!] = getters[i]!();
		}
	};
}

function createResolveInputArrays(
	inputArrays: Record<string, number[]>,
	names: string[],
	resolvers: ArrayResolver[],
	config: Record<string, unknown>,
	configGetters: { keys: string[]; getters: (() => unknown)[] },
): (sr: number, time: number) => void {
	const { keys, getters } = configGetters;

	return (_sr, _time) => {
		for (let i = 0; i < names.length; i++) {
			inputArrays[names[i]!] = resolvers[i]!();
		}
		for (let i = 0; i < keys.length; i++) {
			config[keys[i]!] = getters[i]!();
		}
	};
}
