/**
 * Payne-Hanek reduction for a finite |x| >= 2^20*(pi/2): x*(2/pi) is formed
 * exactly in base-2^24 digits from the digits of 2/pi, then split into an
 * integer part n (mod 8) and a fraction f in [-1/2, 1/2]; y0 + y1 = f*(pi/2).
 * `part` picks the result as in remPio2. Works without arrays: the column
 * sums run in one loop from the low end, carrying, and keep only the nine
 * digits around the binary point. Seven fraction digits (168 bits) cover the
 * worst cancellation a double can produce (about 61 bits).
 */
function remPio2Large(x, part) {
	const base = 16777216;
	const inverseBase = 5.960464477539063e-8;
	const ax = Math.abs(x);
	// ax = mant * 2^e with mant a 53-bit integer, split into 5 + 24 + 24 bits.
	const e = ilogb(ax) - 52;
	const mant = ax * twoPow(-e);
	const top = Math.floor(mant * inverseBase);
	const m2 = Math.floor(mant * 3.552713678800501e-15);
	const m1 = top - m2 * base;
	const m0 = mant - top * base;
	// Column k weighs 2^(e - 24(k + 1)); column kTop weighs w0 in (2^-24, 1].
	const kTop = Math.ceil(e / 24) - 1;
	const w0 = twoPow(e - 24 * (kTop + 1));
	// The weight of the lowest column summed (index 10): w0 * 2^-240.
	let weight = w0 * 5.659799424266695e-73;
	let carry = 0;
	let dHi = 0;
	let d0 = 0;
	let sumHi = 0;
	let sumLo = 0;
	let compHi = 0;
	let compLo = 0;
	for (let k = kTop + 10; k >= kTop - 1; k--) {
		const col =
			m2 * twoOverPiDigit(k + 2) + m1 * twoOverPiDigit(k + 1) + m0 * twoOverPiDigit(k) + carry;
		carry = Math.floor(col * inverseBase);
		const digit = col - carry * base;
		const index = k - kTop;
		if (index >= 1 && index <= 7) {
			// Fraction digit: add it to the plain sum and its complement to the
			// complement sum (1 - f in digits), each as a double-double.
			const plain = digit * weight;
			const comp = (index === 7 ? base - digit : base - 1 - digit) * weight;
			let s = sumHi + plain;
			let back = s - sumHi;
			sumLo += sumHi - (s - back) + (plain - back);
			sumHi = s;
			s = compHi + comp;
			back = s - compHi;
			compLo += compHi - (s - back) + (comp - back);
			compHi = s;
		} else if (index === 0) {
			d0 = digit;
		} else if (index === -1) {
			dHi = digit;
		}
		weight *= base;
	}
	// The integer part mod 8 and the fraction digit above the sums.
	const whole = dHi * (w0 * base) + Math.floor(d0 * w0);
	let n = whole - 8 * Math.floor(whole * 0.125);
	const f0 = d0 - Math.floor(d0 * w0) / w0;
	let topTerm = f0 * w0;
	let hi = sumHi;
	let lo = sumLo;
	let sign = 1;
	if (topTerm + sumHi >= 0.5) {
		n += 1;
		sign = -1;
		topTerm = (1 / w0 - f0 - 1) * w0;
		hi = compHi;
		lo = compLo;
	}
	const s = hi + topTerm;
	const back = s - hi;
	lo += hi - (s - back) + (topTerm - back);
	hi = s;
	const fHi = sign * (hi + lo);
	const fLo = sign * (lo - (hi + lo - hi));
	// y = f * (pi/2) as a double-double: an exact product of the heads, then the tails.
	const p1 = 1.5707963267948966;
	const p2 = 6.123233995736766e-17;
	const prod = fHi * p1;
	const aHi = highBits26(fHi);
	const aLo = fHi - aHi;
	const bHi = highBits26(p1);
	const bLo = p1 - bHi;
	const prodErr = aHi * bHi - prod + aHi * bLo + aLo * bHi + aLo * bLo;
	const tail = prodErr + fHi * p2 + fLo * p1;
	const y0 = prod + tail;
	const negative = x < 0;
	if (part === 0) return negative ? -n : n;
	if (part === 1) return negative ? -y0 : y0;
	const y1 = tail - (y0 - prod);
	return negative ? -y1 : y1;
}
