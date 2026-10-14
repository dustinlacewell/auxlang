/**
 * The start of one random stream: a pure function of (patch seed, module
 * identity, lane). Identity is the node's migration key (pin, else structural
 * id, with a `~k` suffix for duplicates — runtime/state-keys.ts), so the
 * stream follows the node across re-evals exactly as its state does.
 * Never 0: xorshift32 is stuck at 0.
 */

import { fnv1a32 } from "../hash/fnv1a32";
import { avalanche } from "../pattern/random";

export function streamSeed(seed: number, identity: string, lane: number): number {
	let h = avalanche((seed | 0) ^ 0x9e3779b9);
	h = avalanche(h ^ fnv1a32(identity));
	h = avalanche(h ^ Math.imul((lane | 0) + 1, 0x85ebca6b));
	return h === 0 ? 1 : h;
}
