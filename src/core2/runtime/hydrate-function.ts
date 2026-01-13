/**
 * Hydrates a serialized function string back into a callable function.
 *
 * Handles method shorthand like "process(...){...}" which needs "function " prefix.
 */
export function hydrateFunction(source: string): (...args: unknown[]) => unknown {
	let normalized = source;
	// Method shorthand like "process(...){...}" needs "function " prefix
	if (/^\w+\s*\(/.test(source) && !source.startsWith("function")) {
		normalized = `function ${source}`;
	}
	// biome-ignore lint: necessary for deserialization
	return new Function(`return (${normalized})`)();
}
