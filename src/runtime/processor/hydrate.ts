import type { ConfigFn } from "./types";

/** Hydrate config functions from their stringified form */
export function hydrateConfig(config: Record<string, string>): Record<string, ConfigFn> {
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

/** Process function signature - inputs/outputs are plain numbers */
type ProcessFn = (
	inputs: Record<string, number>,
	config: Record<string, ConfigFn>,
	state: Record<string, unknown>,
	sampleRate: number,
) => Record<string, number>;

/** Convert processSource string back into a function */
export function hydrateProcess(source: string): ProcessFn {
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
	return fn as ProcessFn;
}
