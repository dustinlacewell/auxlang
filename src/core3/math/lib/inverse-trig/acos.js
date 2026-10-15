/**
 * Arccosine (fdlibm e_acos): pi/2 - asin(x) below 0.5; above it, through
 * 2*asin(sqrt((1 -+ x)/2)), with sqrt split for accuracy when x > 0.5.
 */
function acos(x) {
	const pio2Hi = 1.5707963267948966;
	const pio2Lo = 6.123233995736766e-17;
	const ax = Math.abs(x);
	if (!(ax < 1)) {
		if (ax === 1) return x < 0 ? 2 * pio2Hi : 0;
		return NaN;
	}
	if (ax < 0.5) {
		if (ax < 6.938900521352129e-18) return pio2Hi;
		return pio2Hi - (x - (pio2Lo - x * asinRatio(x * x)));
	}
	if (x < 0) {
		const zn = (1.0 + x) * 0.5;
		const sn = Math.sqrt(zn);
		const wn = asinRatio(zn) * sn - pio2Lo;
		return 2 * (pio2Hi - (sn + wn));
	}
	const z = (1.0 - x) * 0.5;
	const s = Math.sqrt(z);
	// df + c = sqrt(z), with df*df exact.
	const df = highBits26(s);
	const c = (z - df * df) / (s + df);
	const w = asinRatio(z) * s + c;
	return 2 * (df + w);
}
