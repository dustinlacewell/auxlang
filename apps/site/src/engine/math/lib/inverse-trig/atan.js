/**
 * Arctangent (fdlibm s_atan): fold |x| onto a small interval around 0, 0.5,
 * 1, 1.5 or infinity, then an odd polynomial plus that point's atan.
 */
function atan(x0) {
	const aT0 = 3.33333333333329318027e-1;
	const aT1 = -1.99999999998764832476e-1;
	const aT2 = 1.42857142725034663711e-1;
	const aT3 = -1.1111110405462355788e-1;
	const aT4 = 9.09088713343650656196e-2;
	const aT5 = -7.69187620504482999495e-2;
	const aT6 = 6.66107313738753120669e-2;
	const aT7 = -5.83357013379057348645e-2;
	const aT8 = 4.97687799461593236017e-2;
	const aT9 = -3.6531572744216915527e-2;
	const aT10 = 1.62858201153657823623e-2;
	let x = x0;
	const ax = Math.abs(x);
	const negative = x < 0;
	if (ax >= 7.378697629483821e19) {
		if (x !== x) return x;
		return negative ? -1.5707963267948966 : 1.5707963267948966;
	}
	let id = -1;
	if (ax < 0.4375) {
		if (ax < 7.450580596923828e-9) return x;
	} else {
		x = ax;
		if (ax < 1.1875) {
			if (ax < 0.6875) {
				id = 0;
				x = (2.0 * x - 1.0) / (2.0 + x);
			} else {
				id = 1;
				x = (x - 1.0) / (x + 1.0);
			}
		} else if (ax < 2.4375) {
			id = 2;
			x = (x - 1.5) / (1.0 + 1.5 * x);
		} else {
			id = 3;
			x = -1.0 / x;
		}
	}
	const z = x * x;
	const w = z * z;
	const s1 = z * (aT0 + w * (aT2 + w * (aT4 + w * (aT6 + w * (aT8 + w * aT10)))));
	const s2 = w * (aT1 + w * (aT3 + w * (aT5 + w * (aT7 + w * aT9))));
	if (id < 0) return x - x * (s1 + s2);
	let hi = 1.5707963267948966;
	let lo = 6.123233995736766e-17;
	if (id === 0) {
		hi = 4.63647609000806093515e-1;
		lo = 2.26987774529616870924e-17;
	} else if (id === 1) {
		hi = 7.85398163397448278999e-1;
		lo = 3.06161699786838301793e-17;
	} else if (id === 2) {
		hi = 9.82793723247329054082e-1;
		lo = 1.39033110312309984516e-17;
	}
	const r = hi - (x * (s1 + s2) - lo - x);
	return negative ? -r : r;
}
