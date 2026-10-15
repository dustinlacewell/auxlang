/**
 * Base-10 logarithm (FreeBSD e_log10): k*log10(2) + log(1 + f)/ln10, with
 * the same split as log2 to keep extra precision through the multiplies.
 */
function log10(x) {
	const ivln10hi = 4.34294481878168880939e-1;
	const ivln10lo = 2.50829467116452752298e-11;
	const log10_2hi = 3.01029995663611771306e-1;
	const log10_2lo = 3.69423907715893078616e-13;
	if (x !== x) return x;
	if (x === 0) return -Infinity;
	if (x < 0) return NaN;
	if (x === Infinity) return x;
	if (x === 1) return 0;
	let k = ilogb(x);
	let u = significand(x, k);
	if (u >= 1.4142112731933594) {
		u *= 0.5;
		k += 1;
	}
	const y = k;
	const f = u - 1.0;
	const hfsq = 0.5 * f * f;
	const r = logKernel(f);
	const hi = highBits21(f - hfsq);
	const lo = f - hi - hfsq + r;
	let valHi = hi * ivln10hi;
	const y2 = y * log10_2hi;
	let valLo = y * log10_2lo + (lo + hi) * ivln10lo + lo * ivln10hi;
	const w = y2 + valHi;
	valLo += y2 - w + valHi;
	valHi = w;
	return valLo + valHi;
}
