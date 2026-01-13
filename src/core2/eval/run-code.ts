/**
 * Execute user code string with API in scope.
 */

export function runCode(code: string, api: Record<string, unknown>): void {
	const fn = new Function(...Object.keys(api), code);
	fn(...Object.values(api));
}
