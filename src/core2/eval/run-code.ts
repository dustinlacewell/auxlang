/**
 * Execute user code string with API in scope.
 */

export function runCode(code: string, api: Record<string, unknown>): void {
	const sourceUrl = `auxlang://eval`;
	const codeWithSource = `${code}\n//# sourceURL=${sourceUrl}`;
	
	try {
		const fn = new Function(...Object.keys(api), codeWithSource);
		fn(...Object.values(api));
	} catch (err) {
		const error = err as Error & { lineNumber?: number; columnNumber?: number };
		const message = error.message;
		
		// Try to extract line number from stack trace
		const stack = error.stack || "";
		const lineMatch = stack.match(/:(\d+):(\d+)/);
		
		if (lineMatch) {
			const line = lineMatch[1];
			const col = lineMatch[2];
			throw new Error(`${message} (line ${line}, col ${col})`);
		}
		
		// Try V8 lineNumber/columnNumber properties (SyntaxError often has these)
		if (error.lineNumber) {
			throw new Error(`${message} (line ${error.lineNumber}, col ${error.columnNumber || 0})`);
		}
		
		throw new Error(message);
	}
}
