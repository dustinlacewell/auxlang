/**
 * A new program's identities against the running one (MANIFESTO §6.2): the
 * matcher (match.ts) pairs each new node with the old node whose state it
 * takes over — by pin, then place, then kind — so rewiring resets nothing.
 * Keys follow the pairing (state-keys.ts). Pure, so the main thread runs it
 * and ships the result with the program.
 */

import type { KeyedIdentity, PNode } from "../types";
import { match } from "./match";
import { migrationKeys } from "./state-keys";

export interface ReevalIdentities {
	/** identities[i] is node i's identity and migration key. */
	readonly identities: readonly KeyedIdentity[];
	/** New node index → the old key it takes state from (empty without a running program). */
	readonly paired: ReadonlyMap<number, string>;
}

export function reevalIdentities(
	nodes: readonly PNode[],
	running?: readonly KeyedIdentity[],
): ReevalIdentities {
	const paired = running === undefined ? new Map<number, string>() : match(running, nodes);
	const keys = migrationKeys(nodes, paired);
	return { identities: nodes.map((node, i) => keyed(node, keys[i] as string)), paired };
}

function keyed(node: PNode, key: string): KeyedIdentity {
	const { kind, place, upstream, constants } = node;
	const identity = { key, kind, place, upstream, constants };
	return node.pin === undefined ? identity : { ...identity, pin: node.pin };
}
