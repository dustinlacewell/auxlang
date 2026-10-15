/**
 * Arcsine (fdlibm e_asin): a rational approximation below 0.5; above it,
 * asin(x) = pi/2 - 2*asin(sqrt((1 - |x|)/2)) with sqrt split for accuracy.
 */
function asin(x) {
	const pio2Hi = 1.5707963267948966;
	const pio2Lo = 6.123233995736766e-17;
	const ax = Math.abs(x);
	if (!(ax < 1)) {
		if (ax === 1) return x * pio2Hi;
		return NaN;
	}
	if (ax < 0.5) {
		if (ax < 1.4901161193847656e-8 && ax >= 2.2250738585072014e-308) return x;
		return x + x * asinRatio(x * x);
	}
	const z = (1 - ax) * 0.5;
	const s = Math.sqrt(z);
	const r = asinRatio(z);
	let y = 0;
	if (ax >= 0.9749999046325684) {
		y = pio2Hi - (2 * (s + s * r) - pio2Lo);
	} else {
		// f + c = sqrt(z), with f*f exact.
		const f = highBits26(s);
		const c = (z - f * f) / (s + f);
		y = 0.5 * pio2Hi - (2 * s * r - (pio2Lo - 2 * c) - (0.5 * pio2Hi - 2 * f));
	}
	return x < 0 ? -y : y;
}
