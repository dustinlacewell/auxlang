/**
 * Cube root (FreeBSD s_cbrt): a 5-bit guess from the exponent (fdlibm's
 * divide-the-bits-by-3 trick, done on the values), a polynomial to 23 bits,
 * rounding to 23 bits so t*t is exact, then one Newton step.
 */
function cbrt(x) {
	const P0 = 1.87595182427177009643;
	const P1 = -1.88497979543377169875;
	const P2 = 1.62142972010535446614;
	const P3 = -7.58397934778766047437e-1;
	const P4 = 1.45996192886612446982e-1;
	const ax = Math.abs(x);
	if (!(ax < Infinity) || ax === 0) return x + x;
	// fdlibm's high word of ax (exponent and top 20 mantissa bits) over 3, plus a bias.
	let e = ilogb(ax);
	let bias = 715094163;
	let scaled = ax;
	if (e < -1022) {
		scaled = ax * 18014398509481984;
		e += 54;
		bias = 696219795;
	}
	const top = Math.floor((significand(scaled, e) - 1) * 1048576);
	const word = Math.floor(((e + 1023) * 1048576 + top) / 3) + bias;
	const eh = Math.floor(word / 1048576) - 1023;
	const pe = twoPow(eh);
	let t = (1 + (word - (eh + 1023) * 1048576) / 1048576) * pe;
	// cbrt(x) = t*cbrt(x/t^3) ~= t*P(t^3/x)
	let r = t * t * (t / ax);
	t = t * (P0 + r * (P1 + r * P2) + r * r * r * (P3 + r * P4));
	// Round up to 23 bits, by one to two units (fdlibm adds 2^31 to the bit pattern).
	let unit = pe * 2.384185791015625e-7;
	if (t < pe) unit *= 0.5;
	else if (t >= 2 * pe) unit *= 2;
	t = (Math.floor(t / unit) + 2) * unit;
	// One Newton step to 53 bits, error < 0.667 ulp.
	const s = t * t;
	r = ax / s;
	const w = t + t;
	r = (r - t) / (w + r);
	t = t + t * r;
	return x < 0 ? -t : t;
}
