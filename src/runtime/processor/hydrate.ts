import type { CompiledGraph, ConfigFn, RuntimeNode } from "./types";

/** Hydrate a compiled graph into runtime nodes, optionally restoring state from old nodes */
export function hydrateGraph(
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
					// All state is preserved - devices handle their own config change detection
					// (e.g., seq detects pattern changes and queues them for next beat)
					state = JSON.parse(JSON.stringify(oldState));
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
