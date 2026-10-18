/**
 * The play session's seed (MANIFESTO §7): when a patch does not call
 * `seed(n)`, the host draws a seed when play starts and keeps it across
 * re-evals until stop or reroll. The host passes `current()` as the eval's
 * `seed` option; a patch's own `seed(n)` still wins.
 */

import { drawSeed } from "../random/draw-seed";

export interface SeedSession {
	/** The session seed. The first call after a start (or `end`) draws one. */
	current(): number;
	/** Draw a new session seed and return it. */
	reroll(): number;
	/** End the session (stop): the next `current()` draws again. */
	end(): void;
}

export function createSeedSession(draw: () => number = drawSeed): SeedSession {
	let seed: number | null = null;
	return {
		current() {
			seed ??= draw();
			return seed;
		},
		reroll() {
			seed = draw();
			return seed;
		},
		end() {
			seed = null;
		},
	};
}
