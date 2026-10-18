/** Hyperbolic sine (musl): from expm1 below log(DBL_MAX), then e^x/2 scaled. */
function sinh(x) {
	const h = x < 0 ? -0.5 : 0.5;
	const ax = Math.abs(x);
	if (ax < 709.7822265625) {
		const t = expm1(ax);
		if (ax < 1) {
			if (ax < 1.4901161193847656e-8) return x;
			return h * (2 * t - (t * t) / (t + 1));
		}
		return h * (t + t / (t + 1));
	}
	return expo2(ax, 2 * h);
}
