/**
 * The source text being evaluated right now: a library file or the patch.
 * `defmod` and lambda checks read it to turn a function's position into a
 * file line for their loud errors. Set only for the duration of one
 * evaluation (`withSourceText`); outside one, errors name the line inside the
 * function instead.
 */

export interface SourceText {
	/** What the error names: `lib/noise.js`, `patch`. */
	readonly file: string;
	readonly text: string;
}

let current: SourceText | null = null;

export function withSourceText<T>(source: SourceText, run: () => T): T {
	const outer = current;
	current = source;
	try {
		return run();
	} finally {
		current = outer;
	}
}

export function currentSourceText(): SourceText | null {
	return current;
}

/**
 * The 1-based file line where `fnSource` starts, when it appears verbatim in
 * the current source text. `Function.prototype.toString` returns the exact
 * text of a function evaluated from source, so a library or patch function is
 * always found; a host-compiled one (a test's own closure) is not.
 */
export function locateInSource(fnSource: string): { file: string; line: number } | null {
	if (current === null) return null;
	const at = current.text.indexOf(fnSource);
	if (at < 0) return null;
	let line = 1;
	for (let k = 0; k < at; k++) if (current.text.charCodeAt(k) === 10) line++;
	return { file: current.file, line };
}
