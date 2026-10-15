/**
 * A uniform value in [0, 1) for a 32-bit key under a seed: the same each
 * time the key comes back. A string key is its fnv1a32 hash, folded before
 * the call; a number key goes through hashNumber.
 */
function hashKey(k, seed) {
	return avalanche(avalanche((seed | 0) ^ 0x9e3779b9) ^ k) / 4294967296;
}
