/** Hyperbolic cosine (musl): from expm1 below ln2, exp below log(DBL_MAX), then e^x/2 scaled. */
function cosh(x) {
	const ax = Math.abs(x);
	if (ax < 0.6931467056274414) {
		if (ax < 1.4901161193847656e-8) return 1;
		const t = expm1(ax);
		return 1 + (t * t) / (2 * (1 + t));
	}
	if (ax < 709.7822265625) {
		const t = exp(ax);
		return 0.5 * (t + 1 / t);
	}
	return expo2(ax, 1.0);
}
