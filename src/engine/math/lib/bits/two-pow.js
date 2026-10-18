/**
 * 2^k for an integer k, exactly: 0 below the smallest subnormal, Infinity
 * above the largest double. Built by squaring powers of two, which are exact.
 */
function twoPow(k) {
	// The common small exponents, exactly, from an integer shift.
	if (k >= 0 && k < 31) return 1 << k;
	if (k < 0 && k > -31) return 1 / (1 << -k);
	if (k > 1023) return Infinity;
	if (k < -1074) return 0;
	let p = 1;
	let b = k < 0 ? 0.5 : 2;
	let m = k < 0 ? -k : k;
	while (m > 0) {
		if ((m & 1) === 1) p *= b;
		b *= b;
		m = m >> 1;
	}
	return p;
}
