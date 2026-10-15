/**
 * One step of a random stream: xorshift32 on a u32 position, giving the next
 * position. A position is never 0 (stream-seed.ts), and xorshift32 never
 * reaches 0 from elsewhere. A tick's `Math.random()` is
 * `(s.__rng = nextRng(s.__rng)) / 0xffffffff`, a value in (0, 1].
 */
function nextRng(x) {
	let y = x;
	y ^= y << 13;
	y ^= y >>> 17;
	y ^= y << 5;
	return y >>> 0;
}
