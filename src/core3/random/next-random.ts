/**
 * One step of a lane's random stream. The stream position is the
 * engine-injected `state.__rng` (seeded by stream-seed.ts), so it is ordinary
 * module state: re-eval carries it, snapshots capture it. xorshift32;
 * returns a uniform value in (0, 1]. Allocates nothing.
 */
export function nextRandom(state: Record<string, unknown>): number {
	let x = state.__rng as number;
	x ^= x << 13;
	x ^= x >>> 17;
	x ^= x << 5;
	x >>>= 0;
	state.__rng = x;
	return x / 0xffffffff;
}
