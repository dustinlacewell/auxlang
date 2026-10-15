/**
 * Turn patch source text into a compiled Program. The source is the BODY of a
 * function whose parameters are the core3 user scope (module factories +
 * reserved builders), run inside `runEval` so `out()`/`tempo()` see a live
 * context; `compile` then walks the collected roots.
 *
 * The scope is `buildUserScope()` — generated from the module registry (which
 * `@/core3/modules/all` populates on import), so it is the SINGLE source of the
 * eval scope shared by the docs pages, the live editor, and every headless
 * verifier. Anything that renders an example must go through THIS function so
 * headless-green implies browser-green.
 *
 * Before eval, the source-location rewrite (MANIFESTO §10.1) tags every call,
 * number and pattern token; the evaluated code is the rewritten code, run with
 * the trace bound, and the location tables are active for eval and compile.
 * The Program is the same with or without the rewrite: sites are metadata.
 *
 * Errors are the language's loud errors — surfaced verbatim to the caller,
 * with `sourceRange` (source/located-error) naming the code that failed. The
 * source text is current while it runs, so a tick or lambda error names its
 * patch line.
 */

import "@/core3/modules/all";

import { buildUserScope, compile, runEval } from "@/core3/api";
import type { Program } from "@/core3/api";
import { withSourceText } from "@/core3/module/source-text";
import { TRACE, withActiveSource } from "@/core3/source/active-source";
import { locateError } from "@/core3/source/located-error";
import { TRACE_NAME } from "@/core3/source/rewrite/instrument";
import { rewrite } from "@/core3/source/rewrite/rewrite";
import type { SourceMap } from "@/core3/source/source-map";

const SCOPE = buildUserScope();
const SCOPE_NAMES = Object.keys(SCOPE);
const SCOPE_VALUES = SCOPE_NAMES.map((name) => SCOPE[name]);
const SCOPE_SET: ReadonlySet<string> = new Set(SCOPE_NAMES);

/** A compiled patch, whether it pinned its own seed with seed(n), and its location tables. */
export interface EvaluatedPatch {
	readonly program: Program;
	readonly seedPinned: boolean;
	readonly sourceMap: SourceMap;
}

/** `seed` is the host's seed (the play session's); a patch's own seed(n) wins. */
export function evaluatePatch(source: string, opts: { seed?: number } = {}): EvaluatedPatch {
	const { code, sourceMap } = rewrite(source, SCOPE_SET);
	const patch = patchFunction(code, sourceMap);
	return withSourceText({ file: "patch", text: source }, () =>
		withActiveSource(sourceMap, () => {
			const evaluated = runEval(() => patch(...SCOPE_VALUES, TRACE), opts);
			return { program: compile(evaluated), seedPinned: evaluated.seedPinned, sourceMap };
		}),
	);
}

export function evalPatch(source: string, opts: { seed?: number } = {}): Program {
	return evaluatePatch(source, opts).program;
}

/** The rewritten code as a function of the scope and the trace; a syntax error points where parsing failed. */
function patchFunction(code: string, sourceMap: SourceMap): (...args: unknown[]) => void {
	const body = `${code}\n//# sourceURL=auxlang://core3-playground`;
	try {
		return new Function(...SCOPE_NAMES, TRACE_NAME, body) as (...args: unknown[]) => void;
	} catch (err) {
		throw locateError(err, sourceMap.syntaxError);
	}
}
