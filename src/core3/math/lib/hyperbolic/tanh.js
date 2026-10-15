/** Hyperbolic tangent (musl): from expm1(+-2|x|) by range; 1 beyond |x| = 20. */
function tanh(x) {
	const ax = Math.abs(x);
	// zeros, subnormals and NaN return themselves
	if (!(ax >= 2.2250738585072014e-308)) return x;
	let t = 1;
	if (ax >= 0.5493063926696777) {
		if (ax < 20.000015258789062) {
			t = expm1(2 * ax);
			t = 1 - 2 / (t + 2);
		}
	} else if (ax >= 0.2554128170013428) {
		t = expm1(2 * ax);
		t = t / (t + 2);
	} else {
		t = expm1(-2 * ax);
		t = -t / (t + 2);
	}
	return x < 0 ? -t : t;
}
