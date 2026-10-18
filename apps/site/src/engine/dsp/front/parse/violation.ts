/**
 * The loud error for code outside the tick subset (MANIFESTO §5.1): it names
 * the module, the function (tick, a helper, a lambda), and the line — the
 * file line when the function came from a library file or the patch, else
 * the line inside the function.
 */

export interface FunctionSite {
	/** `defmod('noise')`, or `lambda` for a signal lambda. */
	readonly owner: string;
	/** `tick`, `helper 'step'`, `lambda`. */
	readonly part: string;
	/** Where the function starts in a known source file, when it was found there. */
	readonly origin: { readonly file: string; readonly line: number } | null;
}

export function violation(site: FunctionSite, line: number, message: string): Error {
	const where =
		site.origin === null
			? `${site.part} line ${line}`
			: `${site.part} at ${site.origin.file} line ${site.origin.line + line - 1}`;
	return new Error(`${site.owner}: ${where}: ${message}`);
}
