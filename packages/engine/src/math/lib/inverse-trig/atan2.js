/**
 * The angle of the point (x, y) (fdlibm e_atan2): atan(|y/x|) placed in its
 * quadrant, with the IEEE (and ECMAScript) results for zeros and infinities.
 */
function atan2(y, x) {
	const pi = 3.141592653589793;
	const piLo = 1.2246467991473532e-16;
	const halfPi = 1.5707963267948966;
	if (x !== x || y !== y) return x + y;
	if (x === 1) return atan(y);
	const ySign = y < 0 || (y === 0 && 1 / y < 0) ? 1 : 0;
	const xSign = x < 0 || (x === 0 && 1 / x < 0) ? 2 : 0;
	const m = ySign + xSign;
	const ax = Math.abs(x);
	const ay = Math.abs(y);
	if (ay === 0) {
		if (m < 2) return y;
		return m === 2 ? pi : -pi;
	}
	if (ax === 0) return ySign === 1 ? -halfPi : halfPi;
	if (ax === Infinity) {
		if (ay === Infinity) {
			switch (m) {
				case 0:
					return pi / 4;
				case 1:
					return -pi / 4;
				case 2:
					return (3 * pi) / 4;
				default:
					return (-3 * pi) / 4;
			}
		}
		switch (m) {
			case 0:
				return 0;
			case 1:
				return -0;
			case 2:
				return pi;
			default:
				return -pi;
		}
	}
	// |y/x| > 2^64: the angle is +-pi/2 to double precision.
	if (ay === Infinity || ay > ax * 1.8446744073709552e19) return ySign === 1 ? -halfPi : halfPi;
	let z = 0;
	if (xSign === 0 || !(ay * 1.8446744073709552e19 < ax)) z = atan(Math.abs(y / x));
	switch (m) {
		case 0:
			return z;
		case 1:
			return -z;
		case 2:
			return pi - (z - piLo);
		default:
			return z - piLo - pi;
	}
}
