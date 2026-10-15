/**
 * The parser's view of a pattern site (pattern/notation/notation-source.ts):
 * built from the location tables, a pure function of (map, pattern site).
 */

import type { NotationSource, NotationSplice } from "../pattern/notation/notation-source";
import { patternOffset } from "./pattern-offset";
import type { PatternSite, SourceMap } from "./source-map";

export function notationSource(map: SourceMap, patternId: number): NotationSource | undefined {
	const site = map.sites[patternId];
	if (site?.kind !== "pattern") return undefined;
	const tokens = tokensByOffset(map, patternId);
	return {
		tokenSite: (pos) => {
			const at = patternOffset(site, pos);
			return at === null ? undefined : tokens.get(at);
		},
		range: (pos, length) => {
			const at = patternOffset(site, pos);
			return at === null ? site.range : { start: at, end: at + Math.max(1, length) };
		},
		splice: (index) => spliceOf(map, site, index),
	};
}

function tokensByOffset(map: SourceMap, patternId: number): Map<number, number> {
	const tokens = new Map<number, number>();
	for (const site of map.sites) {
		if (site.kind === "token" && site.pattern === patternId) tokens.set(site.range.start, site.id);
	}
	return tokens;
}

function spliceOf(map: SourceMap, site: PatternSite, index: number): NotationSplice {
	const id = site.splices[index];
	if (id === null || id === undefined) return {};
	const spliced = map.sites[id];
	if (spliced?.kind === "number") return { site: id };
	const text = spliced?.kind === "pattern" ? notationSource(map, id) : undefined;
	return text === undefined ? {} : { text };
}
