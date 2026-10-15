/**
 * x * 2^n for any integer n, rounded once (musl scalbn). Large shifts go in
 * steps that keep the value normal until the last multiply.
 */
function scalbn(x, n) {
	let y = x;
	let k = n;
	if (k > 1023) {
		y *= 8.98846567431158e307;
		k -= 1023;
		if (k > 1023) {
			y *= 8.98846567431158e307;
			k -= 1023;
			if (k > 1023) k = 1023;
		}
	} else if (k < -1022) {
		y *= 2.004168360008973e-292;
		k += 969;
		if (k < -1022) {
			y *= 2.004168360008973e-292;
			k += 969;
			if (k < -1022) k = -1022;
		}
	}
	return y * twoPow(k);
}
