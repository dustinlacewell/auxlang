import type { SerializedConfig } from "../types";
import type { ConfigFn, ConfigVal } from "./types";

/** Hydrate config values from their serialized form */
export function hydrateConfig(config: Record<string, SerializedConfig>): Record<string, ConfigVal> {
	const result: Record<string, ConfigVal> = {};
	for (const [name, serialized] of Object.entries(config)) {
		if (serialized.type === "fn") {
			result[name] = hydrateFunction(serialized.source);
		} else {
			// Plain data - use as-is
			result[name] = serialized.value;
		}
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
	config: Record<string, ConfigVal>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
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
