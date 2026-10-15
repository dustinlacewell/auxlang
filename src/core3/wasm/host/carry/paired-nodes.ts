/**
 * Which old node each new node takes over at a swap: the new engine's
 * `paired` keys (reeval-identities.ts) looked up in the old engine's
 * identities. New node index → old node index. Pure.
 */

import type { EngineFacts } from "../engine-facts";

export function pairedNodes(old: EngineFacts, fresh: EngineFacts): Map<number, number> {
	const byKey = new Map(old.identities.map((identity, i) => [identity.key, i]));
	const pairs = new Map<number, number>();
	for (const [node, key] of fresh.paired) {
		const from = byKey.get(key);
		if (from !== undefined) pairs.set(node, from);
	}
	return pairs;
}
