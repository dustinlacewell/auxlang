/**
 * The location tables of the patch being evaluated right now, and the trace
 * of which call is running. Set only for one evaluation (`withActiveSource`),
 * like the eval context (patch/context.ts) and the source text
 * (module/source-text.ts); outside one, every query answers "unknown" and
 * nothing is tagged.
 *
 * The rewritten code calls `TRACE.enter(id)` before a call and
 * `TRACE.leave(id, value)` after it (source/rewrite/instrument.ts), so the
 * innermost unfinished call is the one building a node, or the one that threw.
 */

import type { NotationSource } from "../pattern/notation/notation-source";
import { locateError } from "./located-error";
import { notationSource } from "./notation-source";
import type { SourceRange } from "./range";
import type { CallSite, SourceMap } from "./source-map";

/** What the rewritten code calls. */
export interface Trace {
	enter(id: number): number;
	leave<T>(id: number, value: T): T;
}

interface Active {
	readonly map: SourceMap;
	/** Site ids of the calls entered and not yet left, innermost last. */
	readonly frames: number[];
}

let current: Active | null = null;

export const TRACE: Trace = {
	enter(id) {
		current?.frames.push(id);
		return id;
	},
	leave(id, value) {
		if (current === null) return value;
		// Pop to this call's own frame; frames above it belong to calls that threw
		// into a try/catch inside the patch.
		const at = current.frames.lastIndexOf(id);
		if (at >= 0) current.frames.length = at;
		return value;
	},
};

/**
 * Run `run` with `map` active. An error escaping it points at the innermost
 * call that was running when it was thrown, unless it already points somewhere.
 */
export function withActiveSource<T>(map: SourceMap, run: () => T): T {
	const outer = current;
	const active: Active = { map, frames: [] };
	current = active;
	try {
		return run();
	} catch (err) {
		throw locateError(err, innermostRange(active));
	} finally {
		current = outer;
	}
}

/** The site of the innermost running call, if a patch is being evaluated. */
export function currentCall(): CallSite | undefined {
	if (current === null) return undefined;
	const id = current.frames[current.frames.length - 1];
	const site = id === undefined ? undefined : current.map.sites[id];
	return site?.kind === "call" ? site : undefined;
}

/** The range of a site in the active tables. */
export function siteRange(id: number | undefined): SourceRange | undefined {
	return id === undefined ? undefined : current?.map.sites[id]?.range;
}

/** Where a pattern site's notation was written, for the parser. */
export function activeNotationSource(patternId: number | undefined): NotationSource | undefined {
	if (current === null || patternId === undefined) return undefined;
	return notationSource(current.map, patternId);
}

/** For a `p` template running now: where its notation was written (`segments` checks it is the same template). */
export function activeTemplateSource(segments: number): NotationSource | undefined {
	const call = currentCall();
	if (call?.pattern === undefined || current === null) return undefined;
	const site = current.map.sites[call.pattern];
	if (site?.kind !== "pattern" || site.segments.length !== segments) return undefined;
	return notationSource(current.map, call.pattern);
}

function innermostRange(active: Active): SourceRange | undefined {
	const id = active.frames[active.frames.length - 1];
	return id === undefined ? undefined : active.map.sites[id]?.range;
}
