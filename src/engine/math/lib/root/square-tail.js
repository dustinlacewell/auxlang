/** The rounding error of x*x given hi = x*x: x*x = hi + tail exactly (Dekker, musl hypot's sq). */
function squareTail(x, hi) {
	const c = x * 134217729;
	const xh = x - c + c;
	const xl = x - xh;
	return xh * xh - hi + 2 * xh * xl + xl * xl;
}
