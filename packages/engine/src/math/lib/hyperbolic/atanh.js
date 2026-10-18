/** Inverse hyperbolic tangent (musl): log1p(2x/(1 - x))/2 in the form each range needs. */
function atanh(x) {
	const ax = Math.abs(x);
	let y = ax;
	if (ax < 0.5) {
		if (ax < 2.3283064365386963e-10) return x;
		y = 0.5 * log1p(2 * ax + (2 * ax * ax) / (1 - ax));
	} else {
		y = 0.5 * log1p(2 * (ax / (1 - ax)));
	}
	return x < 0 ? -y : y;
}
