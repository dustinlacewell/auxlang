/**
 * The one way the WASM compiler fails. The front end (module/front/) decides
 * what tick code is valid and the compiler emits only from its plan, so
 * code the checker accepted always compiles: a failure here is a compiler
 * bug, never the user's error, and says so.
 */

export function compilerBug(where: string, message: string): never {
	throw new Error(`wasm compiler bug: ${where}: ${message}`);
}
