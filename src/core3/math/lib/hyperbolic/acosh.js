/** Inverse hyperbolic cosine (musl): log(x + sqrt(x^2 - 1)) in the form each range needs; NaN below 1. */
function acosh(x) {
	if (x < 2) return log1p(x - 1 + Math.sqrt((x - 1) * (x - 1) + 2 * (x - 1)));
	if (x < 67108864) return log(2 * x - 1 / (x + Math.sqrt(x * x - 1)));
	return log(x) + 0.6931471805599453;
}
