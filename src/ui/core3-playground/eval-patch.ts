/**
 * Turn patch source text into a compiled Program. The source is the BODY of a
 * function whose parameters are the core3 api exports (mirroring core2's
 * run-code.ts new-Function scoping), run inside `runEval` so `out()`/`clock()`
 * see a live context; `compile` then walks the collected roots.
 *
 * Errors are the language's loud errors — surfaced verbatim to the caller.
 */

import "@/core3/modules/all";

import { compile } from "@/core3/api";
import * as api from "@/core3/api";
import { runEval } from "@/core3/api";
import type { Program } from "@/core3/api";

/** Names injected as the user function's parameters, in a stable order. */
const API_NAMES = Object.keys(api);
const API_VALUES = API_NAMES.map((name) => (api as Record<string, unknown>)[name]);

export function evalPatch(source: string): Program {
	const body = `${source}\n//# sourceURL=auxlang://core3-playground`;
	const patch = new Function(...API_NAMES, body) as (...args: unknown[]) => void;
	return compile(runEval(() => patch(...API_VALUES)));
}
