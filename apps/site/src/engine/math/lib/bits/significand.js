/**
 * x * 2^-k in [1, 2), where k = ilogb(x) for a positive finite x. Exact:
 * a subnormal x is first scaled up by 2^54 so the power of two stays finite.
 */
function significand(x, k) {
	if (k < -1022) return x * 18014398509481984 * twoPow(-k - 54);
	return x * twoPow(-k);
}
