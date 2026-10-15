/**
 * The source-location rewrite (MANIFESTO §10.1): a pure function of the patch
 * code. It tags every module call, every numeric literal and every pattern
 * token with its range, and returns the location tables plus the code with
 * each traced call wrapped so eval knows which call is running.
 *
 * `scope` is the user scope's names: a function that calls none of them (and
 * makes no method call but `Math.*`) cannot build a module, so its text is
 * left byte-identical (rewrite/protected-spans).
 *
 * Code that does not parse is returned unchanged; the map then holds only
 * where parsing failed, and eval reports the JS engine's own error.
 */

import type { SourceMap } from "../source-map";
import { callSites } from "./call-sites";
import { instrument } from "./instrument";
import { numberSites } from "./number-sites";
import { parseProgram } from "./parse-program";
import { patternSites } from "./pattern-sites";
import { protectedSpans } from "./protected-spans";
import { SiteList } from "./site-list";

export interface Rewritten {
	readonly code: string;
	readonly sourceMap: SourceMap;
}

export function rewrite(source: string, scope: ReadonlySet<string>): Rewritten {
	const parsed = parseProgram(source);
	if (!parsed.ok) return { code: source, sourceMap: { sites: [], syntaxError: parsed.error } };
	const list = new SiteList();
	const numbers = numberSites(parsed.program, list);
	const patterns = patternSites(parsed.program, numbers, list);
	const spans = protectedSpans(parsed.program, scope);
	const calls = callSites(parsed.program, spans, { numbers, patterns }, list);
	return { code: instrument(source, calls), sourceMap: { sites: list.all() } };
}
