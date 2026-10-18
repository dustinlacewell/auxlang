/**
 * Runtime functions written in the tick subset and compiled by the same
 * emitter as the ticks.
 *
 * fmod is JS `%` on numbers: the exact remainder with the sign of x. It
 * subtracts y scaled by powers of two from the top down; each step's
 * subtraction is exact (Sterbenz: t <= r < 2t), so the result is exact.
 */
export const RUNTIME_SOURCES: Readonly<Record<string, string>> = {
	fmod: `function fmod(x, y) {
	const ax = Math.abs(x);
	const ay = Math.abs(y);
	if (!(ax < Infinity) || !(ay > 0)) return NaN;
	if (ax < ay) return x;
	let t = ay;
	while (t + t <= ax) t = t + t;
	let r = ax;
	while (t >= ay) {
		if (r >= t) r = r - t;
		t = t * 0.5;
	}
	return x < 0 ? -r : r;
}`,
	sign: `function sign(x) {
	return x > 0 ? 1 : x < 0 ? -1 : x;
}`,
};
