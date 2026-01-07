// AudioWorklet globals - these exist in the worklet context
declare const sampleRate: number;
declare class AudioWorkletProcessor {
	readonly port: MessagePort;
	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>,
	): boolean;
}
declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

// Inline types (can't import in worklet context)
interface SerializedSpec {
	inputs: Record<string, { default: number }>;
	outputs: readonly string[];
	defaultOutput: string;
	processSource: string;
}

interface CompiledInput {
	type: "constant" | "connection";
	value?: number;
	nodeId?: string;
	output?: string;
}

interface CompiledNode {
	id: string;
	spec: SerializedSpec;
	inputs: Record<string, CompiledInput>;
	config: Record<string, string>;
}

interface CompiledGraph {
	nodes: readonly CompiledNode[];
	outputNodeId: string;
}

interface WorkletMessage {
	type: "setGraph" | "stop";
	graph?: CompiledGraph;
}

/** A hydrated config function */
type ConfigFn = (...args: unknown[]) => unknown;

/** Runtime node with hydrated process function */
interface RuntimeNode {
	id: string;
	inputs: CompiledNode["inputs"];
	config: Record<string, ConfigFn>;
	defaultOutput: string;
	process: (
		inputs: Record<string, number>,
		config: Record<string, ConfigFn>,
		state: Record<string, unknown>,
		sampleRate: number,
	) => Record<string, number>;
	state: Record<string, unknown>;
}

/** Hydrate a compiled graph into runtime nodes */
function hydrateGraph(graph: CompiledGraph): RuntimeNode[] {
	return graph.nodes.map((node) => ({
		id: node.id,
		inputs: node.inputs,
		config: hydrateConfig(node.config),
		defaultOutput: node.spec.defaultOutput,
		process: hydrateProcess(node.spec.processSource),
		state: {},
	}));
}

/** Hydrate config functions from their stringified form */
function hydrateConfig(config: Record<string, string>): Record<string, ConfigFn> {
	const result: Record<string, ConfigFn> = {};
	for (const [name, source] of Object.entries(config)) {
		result[name] = hydrateFunction(source);
	}
	return result;
}

/** Convert a function string back into a callable function */
function hydrateFunction(source: string): ConfigFn {
	// Arrow functions: (x) => ... or x => ...
	// Function expressions: function(x) { ... }
	// Named functions: function name(x) { ... }
	const fn = new Function(`return (${source})`)();
	return fn as ConfigFn;
}

/** Convert processSource string back into a function */
function hydrateProcess(source: string): RuntimeNode["process"] {
	// source can be:
	// - "process(inp, state, sr) { ... }" (method shorthand)
	// - "function(inp, state, sr) { ... }"
	// - "(inp, state, sr) => { ... }"
	//
	// Method shorthand needs to be converted to a function expression
	let fnSource = source;
	if (source.startsWith("process(") || source.startsWith("process (")) {
		fnSource = `function ${source}`;
	}
	const fn = new Function(`return (${fnSource})`)();
	return fn as RuntimeNode["process"];
}

/**
 * AudioWorklet processor that runs a compiled graph.
 */
class GraphProcessor extends AudioWorkletProcessor {
	private nodes: RuntimeNode[] = [];
	private nodeOutputs: Map<string, Record<string, number>> = new Map();
	private outputNodeId: string | null = null;

	constructor() {
		super();
		this.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
			this.handleMessage(event.data);
		};
	}

	private handleMessage(message: WorkletMessage): void {
		switch (message.type) {
			case "setGraph":
				if (message.graph) {
					this.nodes = hydrateGraph(message.graph);
					this.outputNodeId = message.graph.outputNodeId;
					this.nodeOutputs.clear();
				}
				break;
			case "stop":
				this.nodes = [];
				this.outputNodeId = null;
				this.nodeOutputs.clear();
				break;
		}
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const output = outputs[0];
		if (!output || !output[0] || this.nodes.length === 0 || !this.outputNodeId) {
			return true;
		}

		const channel = output[0];
		const blockSize = channel.length;

		for (let i = 0; i < blockSize; i++) {
			// Process all nodes in order (they're topologically sorted)
			for (const node of this.nodes) {
				const resolvedInputs = this.resolveInputs(node);
				const nodeOutput = node.process(resolvedInputs, node.config, node.state, sampleRate);
				this.nodeOutputs.set(node.id, nodeOutput);
			}

			// Get the output node's default output
			const finalOutputs = this.nodeOutputs.get(this.outputNodeId);
			const outputNode = this.nodes.find((n) => n.id === this.outputNodeId);
			if (finalOutputs && outputNode) {
				const sample = finalOutputs[outputNode.defaultOutput] ?? 0;
				channel[i] = sample;
			}
		}

		// Copy to other channels if stereo
		for (let ch = 1; ch < output.length; ch++) {
			const dest = output[ch];
			if (dest) {
				dest.set(channel);
			}
		}

		return true;
	}

	private resolveInputs(node: RuntimeNode): Record<string, number> {
		const resolved: Record<string, number> = {};

		for (const [name, input] of Object.entries(node.inputs)) {
			if (input.type === "constant") {
				resolved[name] = input.value ?? 0;
			} else if (input.nodeId && input.output) {
				const sourceOutputs = this.nodeOutputs.get(input.nodeId);
				resolved[name] = sourceOutputs?.[input.output] ?? 0;
			}
		}

		return resolved;
	}
}

registerProcessor("graph-processor", GraphProcessor);
