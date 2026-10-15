/**
 * A named inner function that V8 compiles when the outer function runs
 * (engine build), not at its first call: V8 compiles a parenthesised
 * function expression eagerly. The first block then skips the parse and
 * bytecode generation of a large generated function.
 */

export function eagerFunction(name: string, params: string, body: readonly string[]): string[] {
	return [`const ${name} = (function ${name}(${params}) {`, ...body, "});"];
}
