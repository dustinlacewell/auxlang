/**
 * Runtime graph - hydrated and ready to process samples.
 */

import { hydrateFunction } from "../../hydrate-function";
import type { WorkletInput, WorkletSpec, WorkletStereoGraph } from "../../worklet-types";
import type { CollectedStates } from "./collected-states";
import { deepCloneState } from "./deep-clone-state";

// ============================================================================
// Types
// ============================================================================

type ProcessFn = (
	inputs: Record<string, number>,
	config: Record<string, unknown>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => Record<string, number>;

type LambdaFn = (state: Record<string, unknown>, sr: number, time: number) => number;

type HydratedInput =
	| { type: "constant"; value: number }
	| { type: "connection"; nodeId: string; output: string }
	| { type: "lambda"; fn: LambdaFn; state: Record<string, unknown> };

interface RuntimeNode {
	id: string;
	process: ProcessFn;
	inputSources: Record<string, HydratedInput>;
	config: Record<string, () => unknown>;
	state: Record<string, unknown>;
	outputs: Record<string, number>;
}

// ============================================================================
// Hydration
// ============================================================================

function createWasmProcess(instance: WebAssembly.Instance, spec: WorkletSpec): ProcessFn {
	const exports = instance.exports as Record<string, unknown>;
	const processExport = exports.process as ((input: number) => number) | undefined;
	if (!processExport) throw new Error("WASM module missing 'process' export");

	const inputNames = Object.keys(spec.inputs).sort();
	const setters: Record<string, (v: number) => void> = {};
	for (const name of inputNames) {
		const setter = exports[`set_${name}`] as ((v: number) => void) | undefined;
		if (setter) setters[name] = setter;
	}

	return (inputs, _config, _state, _sampleRate) => {
		for (const name of inputNames) {
			setters[name]?.(inputs[name] ?? 0);
		}
		const monoInput = inputs[spec.defaultInput] ?? 0;
		return { [spec.defaultOutput]: processExport(monoInput) };
	};
}

// ============================================================================
// RuntimeGraph
// ============================================================================

export class RuntimeGraph {
	private nodes: RuntimeNode[] = [];
	private nodeMap = new Map<string, RuntimeNode>();
	private leftOutputIds: string[] = [];
	private rightOutputIds: string[] = [];
	private sampleCount = 0;
	private lambdaStates = new Map<string, Record<string, unknown>>();

	constructor(
		graph: WorkletStereoGraph,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates?: CollectedStates,
		nodeMapping?: Map<string, string>,
	) {
		this.leftOutputIds = [...graph.leftOutputIds];
		this.rightOutputIds = [...graph.rightOutputIds];
		if (oldStates) this.sampleCount = oldStates.sampleCount;

		for (const node of graph.nodes) {
			const spec = graph.specs[node.device]!;
			const oldNodeId = nodeMapping?.get(node.id);

			const runtimeNode = this.buildNode(node, spec, wasmInstances.get(node.id), oldNodeId, oldStates);
			this.nodes.push(runtimeNode);
			this.nodeMap.set(node.id, runtimeNode);
		}
	}

	private buildNode(
		node: WorkletStereoGraph["nodes"][number],
		spec: WorkletSpec,
		wasmInstance: WebAssembly.Instance | undefined,
		oldNodeId: string | undefined,
		oldStates: CollectedStates | undefined,
	): RuntimeNode {
		// Restore state from matched old node
		let state: Record<string, unknown> = {};
		if (oldNodeId && oldStates?.nodeStates.has(oldNodeId)) {
			state = deepCloneState(oldStates.nodeStates.get(oldNodeId)!);
		}

		// Hydrate process (WASM or JS)
		const process = wasmInstance
			? createWasmProcess(wasmInstance, spec)
			: (hydrateFunction(spec.processSource) as ProcessFn);

		// Hydrate inputs with lambda state restoration
		const inputSources: Record<string, HydratedInput> = {};
		for (const [name, input] of Object.entries(node.inputs)) {
			inputSources[name] = this.hydrateInput(input, node.id, name, oldNodeId, oldStates);
		}

		// Apply defaults
		for (const [name, def] of Object.entries(spec.inputs)) {
			if (!inputSources[name]) {
				inputSources[name] = { type: "constant", value: def.default };
			}
		}

		// Hydrate config
		const config: Record<string, () => unknown> = {};
		for (const [name, cfg] of Object.entries(node.config)) {
			if (cfg.type === "fn") {
				const fn = hydrateFunction(cfg.source);
				config[name] = () => fn;
			} else {
				config[name] = () => cfg.value;
			}
		}

		// Initialize outputs
		const outputs: Record<string, number> = {};
		for (const out of spec.outputs) outputs[out] = 0;

		return { id: node.id, process, inputSources, config, state, outputs };
	}

	private hydrateInput(
		input: WorkletInput,
		nodeId: string,
		inputName: string,
		oldNodeId: string | undefined,
		oldStates: CollectedStates | undefined,
	): HydratedInput {
		if (input.type === "constant") return { type: "constant", value: input.value };
		if (input.type === "connection") return { type: "connection", nodeId: input.nodeId, output: input.output };

		// Lambda with state restoration
		const fn = hydrateFunction(input.source) as LambdaFn;
		const lambdaKey = `${nodeId}:${inputName}`;
		const oldLambdaKey = oldNodeId ? `${oldNodeId}:${inputName}` : undefined;

		let lambdaState: Record<string, unknown> = {};
		if (oldLambdaKey && oldStates?.lambdaStates.has(oldLambdaKey)) {
			lambdaState = deepCloneState(oldStates.lambdaStates.get(oldLambdaKey)!);
		}
		this.lambdaStates.set(lambdaKey, lambdaState);

		return { type: "lambda", fn, state: lambdaState };
	}

	/**
	 * Process one sample and return stereo output [left, right].
	 * Nodes are processed once, then outputs are mixed to L/R channels.
	 */
	processStereoSample(sr: number): [number, number] {
		const time = this.sampleCount / sr;
		this.sampleCount++;

		// Process all nodes once
		for (const node of this.nodes) {
			const inputs = this.resolveInputs(node, sr, time);
			const config = this.resolveConfig(node);
			const result = node.process(inputs, config, node.state, sr, time);
			Object.assign(node.outputs, result);
		}

		// Mix outputs to stereo
		const left = this.mixOutputs(this.leftOutputIds);
		const right = this.mixOutputs(this.rightOutputIds);
		return [left, right];
	}

	private resolveInputs(node: RuntimeNode, sr: number, time: number): Record<string, number> {
		const inputs: Record<string, number> = {};
		for (const [name, source] of Object.entries(node.inputSources)) {
			if (source.type === "constant") {
				inputs[name] = source.value;
			} else if (source.type === "connection") {
				inputs[name] = this.nodeMap.get(source.nodeId)?.outputs[source.output] ?? 0;
			} else {
				inputs[name] = source.fn(source.state, sr, time);
			}
		}
		return inputs;
	}

	private resolveConfig(node: RuntimeNode): Record<string, unknown> {
		const config: Record<string, unknown> = {};
		for (const [name, getter] of Object.entries(node.config)) {
			config[name] = getter();
		}
		return config;
	}

	private mixOutputs(outputIds: string[]): number {
		let sum = 0;
		for (const id of outputIds) {
			const node = this.nodeMap.get(id);
			if (node) {
				const outputName = Object.keys(node.outputs)[0] ?? "out";
				sum += node.outputs[outputName] ?? 0;
			}
		}
		return outputIds.length > 1 ? sum / Math.sqrt(outputIds.length) : sum;
	}

	collectStates(): CollectedStates {
		const nodeStates = new Map<string, Record<string, unknown>>();
		for (const node of this.nodes) {
			nodeStates.set(node.id, node.state);
		}
		return { nodeStates, lambdaStates: this.lambdaStates, sampleCount: this.sampleCount };
	}
}
