/**
 * Static site -> code range lookup, shared by the glow extension (a watch's
 * call site) and onsets-to-lights (a pattern token's site), plus token
 * adjacency: for a note token, the ids of the `extend`/`tie` tokens right
 * after it in the same pattern that extend its light. Built once per
 * SourceMap (source/source-map.ts); nothing here reads a live frame.
 */

import type { SourceRange } from "auxlang/source/range";
import type { SourceMap } from "auxlang/source/source-map";

export interface SiteRanges {
	rangeOf(site: number): SourceRange | undefined;
	/** Ids of the `extend`/`tie` tokens right after `site`'s note, in order. */
	extendersOf(site: number): readonly number[];
}

export function buildSiteRanges(sourceMap: SourceMap): SiteRanges {
	const ranges = new Map<number, SourceRange>();
	const extenders = new Map<number, number[]>();

	const byPattern = new Map<number, { id: number; token: string }[]>();
	for (const site of sourceMap.sites) {
		ranges.set(site.id, site.range);
		if (site.kind !== "token") continue;
		const list = byPattern.get(site.pattern) ?? [];
		list.push({ id: site.id, token: site.token });
		byPattern.set(site.pattern, list);
	}

	for (const tokens of byPattern.values()) {
		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			if (t === undefined || t.token !== "atom") continue;
			const chain: number[] = [];
			for (let j = i + 1; j < tokens.length; j++) {
				const next = tokens[j];
				if (next === undefined || (next.token !== "extend" && next.token !== "tie")) break;
				chain.push(next.id);
			}
			extenders.set(t.id, chain);
		}
	}

	return {
		rangeOf: (site) => ranges.get(site),
		extendersOf: (site) => extenders.get(site) ?? [],
	};
}
