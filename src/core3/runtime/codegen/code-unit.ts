/**
 * One separately compiled piece of a generated driver: a function body that
 * takes the unit's parameters (bound values, or other units' results) and
 * returns its function. Each unit is its own `new Function`, so the worklet
 * compiles a driver one unit per build step. Calling the compiled factory
 * twice (real values, shadow values) gives two functions that share V8's
 * type feedback and optimized code (tier/).
 */

export interface CodeUnit {
	readonly name: string;
	readonly params: readonly string[];
	/** Statements ending in `return <the unit's result>;`. */
	readonly body: string;
}

export type UnitFactory = (...values: unknown[]) => unknown;

export function compileUnit(unit: CodeUnit): UnitFactory {
	return new Function(...unit.params, `"use strict";\n${unit.body}`) as UnitFactory;
}

/**
 * The unit's body as a function V8 compiles when the factory runs, not at its
 * first call: V8 compiles a parenthesised function expression eagerly.
 */
export function returnFunction(name: string, params: string, body: readonly string[]): string {
	return [`return (function ${name}(${params}) {`, ...body, "});"].join("\n");
}
