/** murmur3's 32-bit finalizer: every input bit flips each output bit with even odds. A u32. */
function avalanche(h) {
	let x = h >>> 0;
	x ^= x >>> 16;
	x = Math.imul(x, 0x85ebca6b);
	x ^= x >>> 13;
	x = Math.imul(x, 0xc2b2ae35);
	x ^= x >>> 16;
	return x >>> 0;
}
