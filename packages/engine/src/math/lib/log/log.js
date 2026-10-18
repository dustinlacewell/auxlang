/**
 * Natural logarithm (fdlibm e_log): x = 2^k * (1 + f) with 1 + f in
 * [sqrt(2)/2, sqrt(2)), then log(1 + f) from s = f/(2 + f) and a polynomial.
 */
function log(x) {
	const ln2Hi = 6.9314718036912381649e-1;
	const ln2Lo = 1.90821492927058770002e-10;
	const Lg1 = 6.66666666666673513e-1;
	const Lg2 = 3.999999999940941908e-1;
	const Lg3 = 2.857142874366239149e-1;
	const Lg4 = 2.222219843214978396e-1;
	const Lg5 = 1.818357216161805012e-1;
	const Lg6 = 1.531383769920937332e-1;
	const Lg7 = 1.479819860511658591e-1;
	if (x !== x) return x;
	if (x === 0) return -Infinity;
	if (x < 0) return NaN;
	if (x === Infinity) return x;
	let k = ilogb(x);
	const m = significand(x, k);
	let u = m;
	if (m >= 1.4142112731933594) {
		u = m * 0.5;
		k += 1;
	}
	const f = u - 1.0;
	const dk = k;
	if (m < 1.0000009536743164 || m >= 1.9999980926513672) {
		// |f| < 2^-20
		if (f === 0) {
			if (k === 0) return 0;
			return dk * ln2Hi + dk * ln2Lo;
		}
		const Rs = f * f * (0.5 - 0.33333333333333333 * f);
		if (k === 0) return f - Rs;
		return dk * ln2Hi - (Rs - dk * ln2Lo - f);
	}
	const s = f / (2.0 + f);
	const z = s * s;
	const w = z * z;
	const t1 = w * (Lg2 + w * (Lg4 + w * Lg6));
	const t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)));
	const R = t2 + t1;
	if (m >= 1.3799991607666016 && m < 1.4200000762939453) {
		const hfsq = 0.5 * f * f;
		if (k === 0) return f - (hfsq - s * (hfsq + R));
		return dk * ln2Hi - (hfsq - (s * (hfsq + R) + dk * ln2Lo) - f);
	}
	if (k === 0) return f - s * (f - R);
	return dk * ln2Hi - (s * (f - R) - dk * ln2Lo - f);
}
