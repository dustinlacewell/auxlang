/** A number as a 32-bit hash key. Whole and fractional parts both count, so 1.25 and 1.5 differ. */
function numberKey(key) {
	const whole = Math.floor(key);
	const frac = ((key - whole) * 4294967296) >>> 0;
	return avalanche(whole | 0) ^ Math.imul(frac, 0xc2b2ae35);
}
