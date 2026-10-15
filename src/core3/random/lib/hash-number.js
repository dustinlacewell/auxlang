/** `hashRandom(key)` for a number key: a uniform value in [0, 1), the same each time the key comes back under `seed`. */
function hashNumber(key, seed) {
	return hashKey(numberKey(key), seed);
}
