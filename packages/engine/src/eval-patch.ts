/**
 * Turn patch source text into a compiled Program. The source is the BODY of a
 * function whose parameters are the user scope (module factories +
 * reserved builders), run inside `runEval` so `out()`/`tempo()` see a live
 * context; `compile` then walks the collected roots.
 *
 * The scope is `buildUserScope()` — generated from the module registry (which
 * `./library/all` populates on import), so it is the SINGLE source of the
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

import "./library/all";

import { buildUserScope, compile, runEval } from "./api";
import type { Program } from "./api";
import { withSourceText } from "./dsp/source-text";
import type { EvalOptions } from "./patch/context";
import { TRACE, withActiveSource } from "./source/active-source";
import { locateError } from "./source/located-error";
import { TRACE_NAME } from "./source/rewrite/instrument";
import { rewrite } from "./source/rewrite/rewrite";
import type { SourceMap } from "./source/source-map";

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

export interface EvalPatchOptions extends EvalOptions {
	/**
	 * Extra bindings layered into the patch scope, on top of the production
	 * user scope (buildUserScope throws if a name collides with a reserved
	 * one). Production callers pass nothing; test fixtures use this to reach
	 * backend-only entry points (module/define-internal-module) from patch text.
	 */
	readonly extraScope?: Record<string, unknown>;
}

/**
 * `seed` is the host's seed (the play session's); a patch's own seed(n) wins.
 * `slotSites`: number-literal sites (from `sourceMap`) whose bindings become
 * live slots (Program.liveSlots).
 */
export function evaluatePatch(source: string, opts: EvalPatchOptions = {}): EvaluatedPatch {
	const { extraScope, ...evalOpts } = opts;
	const [scopeNames, scopeValues, scopeSet] =
		extraScope === undefined ? [SCOPE_NAMES, SCOPE_VALUES, SCOPE_SET] : extendedScope(extraScope);
	const { code, sourceMap } = rewrite(source, scopeSet);
	const patch = patchFunction(code, scopeNames, sourceMap);
	return withSourceText({ file: "patch", text: source }, () =>
		withActiveSource(sourceMap, () => {
			const evaluated = runEval(() => patch(...scopeValues, TRACE), evalOpts);
			return { program: compile(evaluated), seedPinned: evaluated.seedPinned, sourceMap };
		}),
	);
}

export function evalPatch(source: string, opts: EvalPatchOptions = {}): Program {
	return evaluatePatch(source, opts).program;
}

/** The extended scope for one call: never mutates the shared production SCOPE. */
function extendedScope(
	extraScope: Record<string, unknown>,
): [readonly string[], readonly unknown[], ReadonlySet<string>] {
	const scope = buildUserScope(extraScope);
	const names = Object.keys(scope);
	return [names, names.map((name) => scope[name]), new Set(names)];
}

/** The rewritten code as a function of the scope and the trace; a syntax error points where parsing failed. */
function patchFunction(
	code: string,
	scopeNames: readonly string[],
	sourceMap: SourceMap,
): (...args: unknown[]) => void {
	const body = `${code}\n//# sourceURL=auxlang://playground`;
	try {
		return new Function(...scopeNames, TRACE_NAME, body) as (...args: unknown[]) => void;
	} catch (err) {
		throw locateError(err, sourceMap.syntaxError);
	}
}
