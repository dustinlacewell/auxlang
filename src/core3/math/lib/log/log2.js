/**
 * Base-2 logarithm (FreeBSD e_log2): k + log(1 + f)/ln2, with f - f^2/2
 * split so the multiply by 1/ln2 and the add of k keep extra precision.
 */
function log2(x) {
	const ivln2hi = 1.44269504072144627571;
	const ivln2lo = 1.67517131648865118353e-10;
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
	let valHi = hi * ivln2hi;
	let valLo = (lo + hi) * ivln2lo + lo * ivln2hi;
	const w = y + valHi;
	valLo += y - w + valHi;
	valHi = w;
	return valLo + valHi;
}
