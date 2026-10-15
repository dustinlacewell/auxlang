/**
 * `Math.random()` pasted: one step of the lane's xorshift32 stream on the
 * local holding `state.__rng`, the exact steps of random/next-random.ts, as
 * one expression. The local is stored back to the state after the block.
 */

export function randomDraw(rng: string): string {
	return `(${rng} ^= ${rng} << 13, ${rng} ^= ${rng} >>> 17, ${rng} ^= ${rng} << 5, ${rng} >>>= 0, ${rng} / 4294967295)`;
}
