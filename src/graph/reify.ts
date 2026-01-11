/**
 * Graph reification - walks the descriptor DAG to build a runtime graph.
 */

import { isDescriptor } from "../descriptor/guards/is-descriptor";
import { isSignalLambda } from "../descriptor/guards/is-lambda";
import { isOutputRef } from "../descriptor/guards/is-output-ref";
import { isPoly, type PolyDescriptor } from "../descriptor/poly";
import { getDescriptor } from "../descriptor/registry";
import type { AnyDescriptor, ConfigValue, DescriptorId, Signal } from "../descriptor/types";
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
		const resolvedConfig: Record<string, ConfigValue> = {};
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
	signal: Signal | AnyDescriptor | PolyDescriptor,
	visitDependency: (d: AnyDescriptor) => void,
): ResolvedInput {
	// Constant number or array
	if (typeof signal === "number" || Array.isArray(signal)) {
		return { type: "constant", value: signal };
	}

	// Poly descriptor - resolve to multi-connection for polyphonic devices
	if (isPoly(signal)) {
		const sources = signal.voices.map((voice) => {
			visitDependency(voice);
			return {
				nodeId: voice._state.id,
				output: voice._state.spec.defaultOutput,
			};
		});
		return { type: "connections", sources };
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

	// Signal lambda - inline per-sample function
	if (isSignalLambda(signal)) {
		return { type: "lambda", fn: signal };
	}

	throw new Error(`Invalid signal type: ${typeof signal}`);
}
