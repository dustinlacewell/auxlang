/**
 * x^y (fdlibm e_pow) with ECMAScript's special cases: y*log2|x| in extra
 * precision (t1 + t2), then 2^(y*log2|x|) by exp2Split. Base 2 goes to exp2,
 * so `2 ** y` and `pow(2, y)` agree.
 */
function pow(x, y) {
	if (x === 2) return exp2(y);
	if (y !== y) return y;
	if (y === 0) return 1;
	if (x !== x) return x;
	const ax = Math.abs(x);
	const ay = Math.abs(y);
	// yisint: 0 not an integer, 1 odd integer, 2 even integer.
	let yisint = 0;
	if (ay >= 9007199254740992) yisint = ay === Infinity ? 0 : 2;
	else if (Math.floor(ay) === ay) yisint = Math.floor(ay * 0.5) === ay * 0.5 ? 2 : 1;
	if (ay === Infinity) {
		if (ax === 1) return NaN;
		if (ax > 1) return y > 0 ? Infinity : 0;
		return y < 0 ? Infinity : 0;
	}
	if (ax === Infinity || ax === 0) {
		const negativeBase = x < 0 || (x === 0 && 1 / x < 0);
		const z = y > 0 ? ax : 1 / ax;
		return negativeBase && yisint === 1 ? -z : z;
	}
	if (y === 1) return x;
	if (y === -1) return 1 / x;
	if (y === 2) return x * x;
	if (y === 0.5 && x > 0) return Math.sqrt(x);
	if (x < 0 && yisint === 0) return NaN;
	const s = x < 0 && yisint === 1 ? -1.0 : 1.0;
	if (ax === 1) return s;
	let t1 = 0;
	let t2 = 0;
	if (ay >= 2147485696) {
		// |y| > 2^31: over/underflow unless x is within 2^-20 of 1.
		if (ay >= 1.8446761665895596e19) {
			if (ax < 1) return y < 0 ? Infinity : 0;
			return y > 0 ? Infinity : 0;
		}
		if (ax < 0.9999995231628418) return y < 0 ? s * Infinity : s * 0;
		if (ax >= 1.0000009536743164) return y > 0 ? s * Infinity : s * 0;
		// log2(x) from x - x^2/2 + x^3/3 - x^4/4
		const t = ax - 1.0;
		const w = t * t * (0.5 - t * (3.3333333333333331e-1 - t * 0.25));
		// t*ivln2H must be exact (fdlibm assumes it; split t so it is), the rest goes in v.
		const tHi = highBits21(t);
		const u = 1.44269502162933349609 * tHi;
		const v =
			(t - tHi) * 1.44269502162933349609 +
			t * 1.92596299112661746887e-8 -
			w * 1.442695040888963387;
		t1 = highBits21(u + v);
		t2 = v - (t1 - u);
	} else {
		// log2(ax) = n + log2(m), m in [sqrt(3)/2, sqrt(3)) taken around bp = 1 or 1.5,
		// from ss = (m - bp)/(m + bp) and a polynomial, carried as t1 + t2.
		let n = ilogb(ax);
		let m = significand(ax, n);
		let big = false;
		if (m >= 1.224745750427246) {
			if (m < 1.7320499420166016) big = true;
			else {
				n += 1;
				m *= 0.5;
			}
		}
		const bp = big ? 1.5 : 1.0;
		const dpH = big ? 5.84962487220764160156e-1 : 0.0;
		const dpL = big ? 1.35003920212974897128e-8 : 0.0;
		const u = m - bp;
		const v = 1.0 / (m + bp);
		const ss = u * v;
		const sH = highBits21(ss);
		const tH = highBits21(m + bp);
		const tL = m - (tH - bp);
		const sL = v * (u - sH * tH - sH * tL);
		let s2 = ss * ss;
		let r =
			s2 *
			s2 *
			(5.99999999999994648725e-1 +
				s2 *
					(4.28571428578550184252e-1 +
						s2 *
							(3.33333329818377432918e-1 +
								s2 *
									(2.72728123808534006489e-1 +
										s2 * (2.30660745775561754067e-1 + s2 * 2.06975017800338417784e-1)))));
		r += sL * (sH + ss);
		s2 = sH * sH;
		const tH2 = highBits21(3.0 + s2 + r);
		const tL2 = r - (tH2 - 3.0 - s2);
		const uu = sH * tH2;
		const vv = sL * tH2 + tL2 * ss;
		const pH = highBits21(uu + vv);
		const pL = vv - (pH - uu);
		// 2/(3 ln2) = cpH + cpL
		const zH = 9.61796700954437255859e-1 * pH;
		const zL = -7.02846165095275826516e-9 * pH + pL * 9.61796693925975554329e-1 + dpL;
		t1 = highBits21(zH + zL + dpH + n);
		t2 = zL - (t1 - n - dpH - zH);
	}
	// (y1 + y2) * (t1 + t2) with y1 * t1 exact
	const y1 = highBits21(y);
	const pL = (y - y1) * t1 + y * t2;
	const pH = y1 * t1;
	const z = pL + pH;
	if (z >= 1024) {
		if (z > 1024 || pL + 8.0085662595372944372e-17 > z - pH) return s * Infinity;
	} else if (z <= -1075) {
		if (z < -1075 || pL <= z - pH) return s * 0;
	}
	return s * exp2Split(pH, pL);
}
