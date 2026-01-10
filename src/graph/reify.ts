/**
 * Graph reification - walks the descriptor DAG to build a runtime graph.
 */

import { isDescriptor } from "../descriptor/is-descriptor";
import { isFeedbackRef } from "../descriptor/is-feedback-ref";
import { isOutputRef } from "../descriptor/is-output-ref";
import { getDescriptor } from "../descriptor/registry";
import type { AnyDescriptor, DescriptorId, FeedbackRef, Signal } from "../descriptor/types";
import type { Graph, GraphNode, ResolvedInput } from "./types";

/**
 * Reify a descriptor into a runtime graph.
 *
 * Walks the DAG from the output descriptor, collecting all
 * referenced descriptors and resolving their connections.
 */
export function reify(output: AnyDescriptor): Graph {
	const visited = new Set<DescriptorId>();
	const nodes: GraphNode[] = [];

	// Depth-first traversal to collect nodes in dependency order
	function visit(descriptor: AnyDescriptor): void {
		const { id, spec, inputBindings, configBindings } = descriptor._state;

		if (visited.has(id)) return;
		visited.add(id);

		// First visit all dependencies
		const resolvedInputs: Record<string, ResolvedInput> = {};

		for (const [inputName, inputDef] of Object.entries(spec.inputs)) {
			const binding = inputBindings[inputName];
			resolvedInputs[inputName] = resolveInput(binding ?? inputDef.default, visit);
		}

		// Resolve config bindings (use bound value or default)
		const resolvedConfig: Record<string, (...args: unknown[]) => unknown> = {};
		for (const [configName, configDef] of Object.entries(spec.config)) {
			resolvedConfig[configName] = configBindings[configName] ?? configDef.default;
		}

		// Then add this node (dependencies come first)
		nodes.push({
			id,
			spec,
			inputBindings: resolvedInputs,
			configBindings: resolvedConfig,
		});
	}

	visit(output);

	return {
		nodes,
		outputNodeId: output._state.id,
	};
}

function resolveInput(
	signal: Signal | AnyDescriptor,
	visitDependency: (d: AnyDescriptor) => void,
): ResolvedInput {
	// Constant number or array
	if (typeof signal === "number" || Array.isArray(signal)) {
		return { type: "constant", value: signal };
	}

	// Descriptor - use its default output (D016)
	if (isDescriptor(signal)) {
		visitDependency(signal);
		return {
			type: "connection",
			nodeId: signal._state.id,
			output: signal._state.spec.defaultOutput,
		};
	}

	// FeedbackRef - reference to the output of the node being built (creates a cycle)
	// We do NOT visit the target as a dependency - that would cause infinite recursion
	if (isFeedbackRef(signal)) {
		return {
			type: "feedback",
			nodeId: signal.targetId,
			output: signal.outputName,
		};
	}

	// OutputRef - reference to another descriptor's output
	if (isOutputRef(signal)) {
		const sourceDescriptor = getDescriptor(signal.descriptorId);
		if (!sourceDescriptor) {
			throw new Error(`Unknown descriptor: ${signal.descriptorId}`);
		}

		// Validate that the output name exists on the source descriptor
		const validOutputs = sourceDescriptor._state.spec.outputs;
		if (!validOutputs.includes(signal.outputName)) {
			throw new Error(
				`"${signal.outputName}" is not an output of this device. Available outputs: ${validOutputs.join(", ")}`,
			);
		}

		visitDependency(sourceDescriptor);
		return {
			type: "connection",
			nodeId: signal.descriptorId,
			output: signal.outputName,
		};
	}

	throw new Error(`Invalid signal type: ${typeof signal}`);
}
