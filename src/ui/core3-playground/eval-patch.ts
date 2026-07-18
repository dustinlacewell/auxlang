/**
 * Turn patch source text into a compiled Program. The source is the BODY of a
 * function whose parameters are the core3 user scope (module factories +
 * reserved builders), run inside `runEval` so `out()`/`clock()` see a live
 * context; `compile` then walks the collected roots.
 *
 * The scope is `buildUserScope()` — generated from the module registry (which
 * `@/core3/modules/all` populates on import), so it is the SINGLE source of the
 * eval scope shared by the docs pages, the live editor, and every headless
 * verifier. Anything that renders an example must go through THIS function so
 * headless-green implies browser-green.
 *
 * Errors are the language's loud errors — surfaced verbatim to the caller.
 */

import "@/core3/modules/all";

import { buildUserScope, compile, runEval } from "@/core3/api";
import type { Program } from "@/core3/api";

const SCOPE = buildUserScope();
const SCOPE_NAMES = Object.keys(SCOPE);
const SCOPE_VALUES = SCOPE_NAMES.map((name) => SCOPE[name]);

export function evalPatch(source: string): Program {
	const body = `${source}\n//# sourceURL=auxlang://core3-playground`;
	const patch = new Function(...SCOPE_NAMES, body) as (...args: unknown[]) => void;
	return compile(runEval(() => patch(...SCOPE_VALUES)));
}
