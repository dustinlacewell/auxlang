/**
 * sqrt(x^2 + y^2) without undue overflow or underflow (musl hypot): the
 * squares in double-double, scaled by 2^+-700 at the extremes. Takes exactly
 * two arguments; any infinity wins over NaN, as ECMAScript says.
 */
function hypot(a, b) {
	let x = Math.abs(a);
	let y = Math.abs(b);
	if (x === Infinity || y === Infinity) return Infinity;
	if (x !== x || y !== y) return NaN;
	if (x < y) {
		const t = x;
		x = y;
		y = t;
	}
	if (y === 0) return x;
	// y/x below 2^-64: the result is x to double precision.
	if (x > y * 1.8446744073709552e19) return x + y;
	let z = 1;
	if (x >= 6.703903964971299e153) {
		z = 5.260135901548374e210;
		x *= 1.90109156629516e-211;
		y *= 1.90109156629516e-211;
	} else if (y < 3.4395525670743494e-136) {
		z = 1.90109156629516e-211;
		x *= 5.260135901548374e210;
		y *= 5.260135901548374e210;
	}
	const hx = x * x;
	const hy = y * y;
	return z * Math.sqrt(squareTail(y, hy) + squareTail(x, hx) + hy + hx);
}
