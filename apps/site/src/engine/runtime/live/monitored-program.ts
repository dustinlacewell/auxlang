/**
 * A program prepared to be monitored: each watched seq (watch-list.ts) gets
 * the `sites` config flag, so its event tables carry each row's source site
 * (bridge/lane-table.ts `hasSites`), which its onsets report. Everything
 * else is the program as given; unwatched nodes keep their objects. Pure.
 */

import type { Program, Registry } from "../../types";
import { watchList } from "./watch-list";

/** The module whose lane 0 reports note onsets. */
export const ONSET_READER = "seq";

export function monitoredProgram(program: Program, registry: Registry): Program {
	const readers = new Set(
		watchList(program, registry)
			.filter((w) => w.module === ONSET_READER)
			.map((w) => w.node),
	);
	if (readers.size === 0) return program;
	const nodes = program.nodes.map((node, i) =>
		readers.has(i) ? { ...node, config: { ...node.config, sites: 1 } } : node,
	);
	return { ...program, nodes };
}
