/**
 * A fresh patch seed for a play session that did not pin one: a whole number
 * short enough to read off the editor and type into `seed(n)`. `random` is
 * the host's entropy, injected so tests can fix it.
 */

const SEED_RANGE = 1_000_000;

export function drawSeed(random: () => number = Math.random): number {
	return 1 + Math.floor(random() * (SEED_RANGE - 1));
}
