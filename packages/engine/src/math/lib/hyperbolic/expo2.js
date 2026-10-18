/**
 * sign * e^x / 2 for x >= log(DBL_MAX), without overflowing before the last
 * multiply (musl __expo2): e^(x - k*ln2) * 2^(k - 1) with k = 2043.
 */
function expo2(x, sign) {
	const kln2 = 1416.0996898839683;
	const scale = 2.247116418577895e307;
	return exp(x - kln2) * (sign * scale) * scale;
}
