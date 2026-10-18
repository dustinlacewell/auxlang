/**
 * log(1 + x), accurate near 0 (fdlibm s_log1p): as log, with a correction
 * term c for the rounding of 1 + x.
 */
function log1p(x) {
	const ln2Hi = 6.9314718036912381649e-1;
	const ln2Lo = 1.90821492927058770002e-10;
	const Lp1 = 6.66666666666673513e-1;
	const Lp2 = 3.999999999940941908e-1;
	const Lp3 = 2.857142874366239149e-1;
	const Lp4 = 2.222219843214978396e-1;
	const Lp5 = 1.818357216161805012e-1;
	const Lp6 = 1.531383769920937332e-1;
	const Lp7 = 1.479819860511658591e-1;
	if (x !== x) return x;
	let k = 1;
	let f = 0;
	let c = 0;
	// hu is fdlibm's high mantissa word; only "is it 0" (|f| < 2^-20) matters.
	let hu = 1;
	if (x < 0.4142136573791504) {
		if (x <= -1.0) return x === -1.0 ? -Infinity : NaN;
		const ax = Math.abs(x);
		if (ax < 1.862645149230957e-9) {
			if (ax < 5.551115123125783e-17) return x;
			return x - x * x * 0.5;
		}
		if (x > -0.292893648147583) {
			// sqrt(2)/2 <= 1 + x < sqrt(2)
			k = 0;
			f = x;
		}
	}
	if (x === Infinity) return x;
	if (k !== 0) {
		let u = x;
		if (x < 9007199254740992) {
			u = 1.0 + x;
			k = ilogb(u);
			c = k > 0 ? 1.0 - (u - x) : x - (u - 1.0);
			c /= u;
		} else {
			k = ilogb(u);
			c = 0;
		}
		const m = significand(u, k);
		if (m < 1.4142131805419922) {
			hu = m < 1.0000009536743164 ? 0 : 1;
			f = m - 1.0;
		} else {
			k += 1;
			hu = m >= 1.9999971389770508 ? 0 : 1;
			f = m * 0.5 - 1.0;
		}
	}
	const hfsq = 0.5 * f * f;
	if (hu === 0) {
		if (f === 0) {
			if (k === 0) return 0;
			c += k * ln2Lo;
			return k * ln2Hi + c;
		}
		const Rs = hfsq * (1.0 - 0.66666666666666666 * f);
		if (k === 0) return f - Rs;
		return k * ln2Hi - (Rs - (k * ln2Lo + c) - f);
	}
	const s = f / (2.0 + f);
	const z = s * s;
	const R = z * (Lp1 + z * (Lp2 + z * (Lp3 + z * (Lp4 + z * (Lp5 + z * (Lp6 + z * Lp7))))));
	if (k === 0) return f - (hfsq - s * (hfsq + R));
	return k * ln2Hi - (hfsq - (s * (hfsq + R) + (k * ln2Lo + c)) - f);
}
