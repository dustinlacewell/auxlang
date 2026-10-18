/** Inverse hyperbolic sine (musl): log(|x| + sqrt(x^2 + 1)) in the form each range needs. */
function asinh(x) {
	const ax = Math.abs(x);
	let y = ax;
	if (ax >= 67108864) {
		y = log(ax) + 0.6931471805599453;
	} else if (ax >= 2) {
		y = log(2 * ax + 1 / (Math.sqrt(ax * ax + 1) + ax));
	} else if (ax >= 1.4901161193847656e-8) {
		y = log1p(ax + (ax * ax) / (Math.sqrt(ax * ax + 1) + 1));
	} else {
		return x;
	}
	return x < 0 ? -y : y;
}
