/**
 * Hydrates a serialized function string back into a callable function.
 *
 * Handles method shorthand like "process(...){...}" which needs "function " prefix.
 */
export function hydrateFunction(source: string | ((...args: unknown[]) => unknown)): (...args: unknown[]) => unknown {
	let normalized = typeof source === "function" ? source.toString() : source;
	// Method shorthand like "process(...){...}" needs "function " prefix
	if (/^\w+\s*\(/.test(normalized) && !normalized.startsWith("function")) {
		normalized = `function ${normalized}`;
	}
	if (normalized === "[object Function]") {
		throw new Error("Cannot hydrate function: source was '[object Function]' (lost body). Ensure lambdas use .toString().");
	}
	// biome-ignore lint: necessary for deserialization
	return new Function(`return (${normalized})`)();
}
