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
// All signals are polyphonic: number[] where length = channel count (1-16)
type PolySignal = number[];

interface SerializedSpec {
	inputs: Record<string, { default: PolySignal }>;
	outputs: readonly string[];
	defaultOutput: string;
	processSource: string;
}

interface CompiledInput {
	type: "constant" | "connection";
	value?: PolySignal;
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

// ============================================================================
// Topology Hashing (inlined - can't import in worklet context)
// ============================================================================

type TopologyHash = string;

/**
 * Simple string hash function.
 * We don't need cryptographic strength, just uniqueness.
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	return Math.abs(hash).toString(36);
}

/**
 * Hash an input binding for topology identity.
 * Constants become "const" (value excluded for stability).
 * Connections become the source node's hash + output name.
 */
function hashInput(
	input: CompiledInput,
	nodeHashes: Map<string, TopologyHash>,
): string {
	if (input.type === "constant") {
		return "const";
	}
	const sourceHash = nodeHashes.get(input.nodeId ?? "");
	if (!sourceHash) {
		return "unknown";
	}
	return `${sourceHash}.${input.output}`;
}

/**
 * Compute topology hash for a compiled node.
 * Based on device type (process source) and input connection structure.
 *
 * Config is EXCLUDED from the hash so that changing parameters (BPM, pattern)
 * still matches to the same node. This enables:
 * - Clock state preserved when BPM changes (phase continuity)
 * - Seq matches when pattern changes (position preserved)
 *
 * State clearing for config-derived caches (like seq's parsed pattern) happens
 * in hydrateGraph, not via hash differentiation.
 */
function computeNodeHash(
	node: CompiledNode,
	nodeHashes: Map<string, TopologyHash>,
): TopologyHash {
	const parts: string[] = [];

	// Device type identity: use process function source
	parts.push(`type:${node.spec.processSource}`);

	// Input connection structure (sorted for determinism)
	const inputNames = Object.keys(node.inputs).sort();
	for (const inputName of inputNames) {
		const input = node.inputs[inputName];
		if (input) {
			parts.push(`in:${inputName}:${hashInput(input, nodeHashes)}`);
		}
	}

	// Config is intentionally NOT included - we want nodes to match
	// even when their config changes (BPM, pattern, etc.)

	return simpleHash(parts.join("|"));
}

/**
 * Compute topology hashes for all nodes in a compiled graph.
 * Nodes must be in topological order (dependencies first).
 */
function computeGraphHashes(nodes: readonly CompiledNode[]): Map<string, TopologyHash> {
	const hashes = new Map<string, TopologyHash>();
	for (const node of nodes) {
		const hash = computeNodeHash(node, hashes);
		hashes.set(node.id, hash);
	}
	return hashes;
}

/**
 * Diff two graphs to find node correspondence by topology.
 * Returns a map from new node ID to old node ID for matched nodes.
 */
function diffGraphs(
	oldNodes: readonly CompiledNode[],
	newNodes: readonly CompiledNode[],
): Map<string, string> {
	const oldHashes = computeGraphHashes(oldNodes);
	const newHashes = computeGraphHashes(newNodes);

	// Build reverse map: hash → old node ID
	const oldByHash = new Map<TopologyHash, string>();
	for (const [id, hash] of oldHashes) {
		oldByHash.set(hash, id);
	}

	// Match new nodes to old nodes by hash
	const matched = new Map<string, string>();
	for (const [newId, hash] of newHashes) {
		const oldId = oldByHash.get(hash);
		if (oldId !== undefined) {
			matched.set(newId, oldId);
		}
	}

	return matched;
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
		inputs: Record<string, PolySignal>,
		config: Record<string, ConfigFn>,
		state: Record<string, unknown>,
		sampleRate: number,
	) => Record<string, number | PolySignal>;
	state: Record<string, unknown>;
}

/** Hydrate a compiled graph into runtime nodes, optionally restoring state from old nodes */
function hydrateGraph(
	graph: CompiledGraph,
	oldStates?: Map<string, Record<string, unknown>>,
	nodeMapping?: Map<string, string>,
): RuntimeNode[] {
	return graph.nodes.map((node) => {
		// Try to restore state from matched old node
		let state: Record<string, unknown> = {};
		if (oldStates && nodeMapping) {
			const oldNodeId = nodeMapping.get(node.id);
			if (oldNodeId) {
				const oldState = oldStates.get(oldNodeId);
				if (oldState) {
					// Deep copy to avoid sharing references
					state = JSON.parse(JSON.stringify(oldState));

					// Clear ONLY config-derived caches - not timing state!
					// Seq caches parsed pattern in state.pat - must re-parse new pattern
					delete state.pat;

					// Timing state (beatIndex, cycleCount, phase, etc.) is PRESERVED
					// so that clock and seq continue from their current position.
					// If pattern length changed, seq will naturally wrap beatIndex.
				}
			}
		}

		return {
			id: node.id,
			inputs: node.inputs,
			config: hydrateConfig(node.config),
			defaultOutput: node.spec.defaultOutput,
			process: hydrateProcess(node.spec.processSource),
			state,
		};
	});
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
 *
 * All signals are polyphonic (number[]). Devices receive poly inputs
 * and return poly outputs. The runtime normalizes scalar returns to [scalar].
 * Devices handle their own polyphony logic internally.
 *
 * Supports live re-evaluation: when a new graph is sent, nodes with the same
 * topological position (device type + connection structure) preserve their state.
 * Graph swaps are deferred to the next beat boundary for seamless transitions.
 */
class GraphProcessor extends AudioWorkletProcessor {
	private nodes: RuntimeNode[] = [];
	private nodeOutputs: Map<string, Record<string, PolySignal>> = new Map();
	private outputNodeId: string | null = null;

	// For live re-evaluation: keep old graph info for diffing
	private oldGraph: CompiledGraph | null = null;

	// Pending graph swap - deferred until next beat
	private pendingGraph: CompiledGraph | null = null;

	// Track last trigger value to detect beat boundaries
	private lastTrigValue = 0;

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
					if (this.nodes.length === 0) {
						// No existing graph - swap immediately
						this.swapGraph(message.graph);
					} else {
						// Defer swap until next beat
						this.pendingGraph = message.graph;
					}
				}
				break;
			case "stop":
				this.nodes = [];
				this.outputNodeId = null;
				this.nodeOutputs.clear();
				this.oldGraph = null;
				this.pendingGraph = null;
				break;
		}
	}

	/**
	 * Check if we just hit a beat boundary by looking for clock trigger output.
	 * Looks specifically for the first node with a `trig` output (should be clock).
	 */
	private checkBeatBoundary(): boolean {
		for (const [_nodeId, outputs] of this.nodeOutputs) {
			const trig = outputs.trig;
			if (trig && trig[0] !== undefined) {
				const trigValue = trig[0];
				// Detect rising edge: was low, now high
				if (trigValue >= 1 && this.lastTrigValue < 1) {
					this.lastTrigValue = trigValue;
					return true;
				}
				this.lastTrigValue = trigValue;
				return false; // Only check the first node with trig output
			}
		}
		return false;
	}

	/**
	 * Swap to a new graph, preserving state for topologically-matched nodes.
	 */
	private swapGraph(newGraph: CompiledGraph): void {
		// Collect current node states before swapping
		const oldStates = new Map<string, Record<string, unknown>>();
		for (const node of this.nodes) {
			oldStates.set(node.id, node.state);
		}

		// Compute node mapping if we have an old graph
		let nodeMapping: Map<string, string> | undefined;
		if (this.oldGraph) {
			nodeMapping = diffGraphs(this.oldGraph.nodes, newGraph.nodes);
		}

		// Hydrate new graph with state restoration
		this.nodes = hydrateGraph(newGraph, oldStates, nodeMapping);
		this.outputNodeId = newGraph.outputNodeId;
		this.nodeOutputs.clear();

		// Store for next swap
		this.oldGraph = newGraph;
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
				const nodeOutput = this.processNode(node);
				this.nodeOutputs.set(node.id, nodeOutput);
			}

			// Get the output node's default output and sum all channels to mono
			const finalOutputs = this.nodeOutputs.get(this.outputNodeId);
			const outputNode = this.nodes.find((n) => n.id === this.outputNodeId);
			if (finalOutputs && outputNode) {
				const polySample = finalOutputs[outputNode.defaultOutput] ?? [0];
				// Sum all channels to mono output
				const sample = polySample.reduce((a, b) => a + b, 0);
				channel[i] = sample;
			}

			// Check for pending graph swap at beat boundary
			if (this.pendingGraph && this.checkBeatBoundary()) {
				this.swapGraph(this.pendingGraph);
				this.pendingGraph = null;
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

	/**
	 * Process a node: resolve inputs, call process once, normalize outputs.
	 */
	private processNode(node: RuntimeNode): Record<string, PolySignal> {
		// Resolve inputs to poly signals
		const polyInputs = this.resolvePolyInputs(node);

		// Call process once with poly inputs
		const output = node.process(polyInputs, node.config, node.state, sampleRate);

		// Normalize outputs: wrap scalars in arrays
		const polyOutputs: Record<string, PolySignal> = {};
		for (const [name, value] of Object.entries(output)) {
			if (Array.isArray(value)) {
				polyOutputs[name] = value;
			} else {
				polyOutputs[name] = [value];
			}
		}

		return polyOutputs;
	}

	/**
	 * Resolve node inputs to polyphonic signals.
	 */
	private resolvePolyInputs(node: RuntimeNode): Record<string, PolySignal> {
		const resolved: Record<string, PolySignal> = {};

		for (const [name, input] of Object.entries(node.inputs)) {
			if (input.type === "constant") {
				resolved[name] = input.value ?? [0];
			} else if (input.nodeId && input.output) {
				const sourceOutputs = this.nodeOutputs.get(input.nodeId);
				resolved[name] = sourceOutputs?.[input.output] ?? [0];
			} else {
				resolved[name] = [0];
			}
		}

		return resolved;
	}
}

registerProcessor("graph-processor", GraphProcessor);
