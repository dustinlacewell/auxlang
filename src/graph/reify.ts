/**
 * Graph reification - walks the descriptor DAG to build a runtime graph.
 */

import { isSignalLambda } from "../descriptor/guards/is-lambda";
import { isOutputRef } from "../descriptor/guards/is-output-ref";
import { getDescriptor } from "../descriptor/registry";
import type { AnyDescriptor, ConfigValue, DescriptorId, BoundPoly, BoundSignal } from "../descriptor/types";
import type { Graph, GraphNode, ResolvedInput, SourceInput } from "./types";

/** Type guard for NormalizedPoly */
function isNormalizedPoly(value: unknown): value is BoundPoly {
	if (value === null || value === undefined) return false;
	if (typeof value !== "object") return false;
	return "_poly" in value && (value as BoundPoly)._poly === true;
}

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
	signal: BoundSignal,
	visitDependency: (d: AnyDescriptor) => void,
): ResolvedInput {
	// Constant number or array
	if (typeof signal === "number" || Array.isArray(signal)) {
		return { type: "constant", value: signal };
	}

	// NormalizedPoly - voices can be any BoundSignal type
	if (isNormalizedPoly(signal)) {
		const sources: SourceInput[] = signal.voices.map((voice) => {
			return resolveSource(voice, visitDependency);
		});
		return { type: "connections", sources };
	}

	// OutputRef - reference to a descriptor's output
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

/**
 * Resolve a single voice to a SourceInput (for poly voices).
 * Unlike resolveInput, this only returns non-nested types (constant, connection, lambda).
 */
function resolveSource(
	signal: BoundSignal,
	visitDependency: (d: AnyDescriptor) => void,
): SourceInput {
	// Constant number (arrays not allowed as individual voice - they're poly)
	if (typeof signal === "number") {
		return { type: "constant", value: signal };
	}

	// OutputRef - reference to a descriptor's output
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

	// Arrays and nested polys shouldn't appear as individual voices
	if (Array.isArray(signal) || isNormalizedPoly(signal)) {
		throw new Error("Nested poly or array not supported as voice");
	}

	throw new Error(`Invalid voice signal type: ${typeof signal}`);
}
