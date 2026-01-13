/**
 * Build config getters for node configuration.
 */

import { hydrateFunction } from "../../../hydrate-function";
import type { WorkletConfig } from "../../../worklet-types";

export function buildConfigGetters(
	nodeConfig: Record<string, WorkletConfig>,
): { keys: string[]; getters: (() => unknown)[] } {
	const keys: string[] = [];
	const getters: (() => unknown)[] = [];

	for (const [name, cfg] of Object.entries(nodeConfig)) {
		keys.push(name);
		if (cfg.type === "fn") {
			const fn = hydrateFunction(cfg.source);
			getters.push(() => fn);
		} else {
			const value = cfg.value;
			getters.push(() => value);
		}
	}

	return { keys, getters };
}
