/**
 * `seed(n)` — a setting (MANIFESTO §6, §7): pins the patch seed. Like
 * `tempo()`, it binds when eval finishes — nothing reads the seed until
 * compile — so it may appear anywhere in the code. A second `seed()` in one
 * eval is a loud error. Without it, the patch seed is the host's (the editor
 * draws one when play starts; see runtime/seed-session.ts).
 */

import { checkSeed } from "../random/check-seed";
import { evalCtx } from "./context";

export function seed(n: unknown): void {
	const ctx = evalCtx("seed()");
	if (ctx.seedPinned) {
		throw new Error("seed() is a setting and may appear once per patch; remove the second call");
	}
	ctx.seed = checkSeed(n, "seed(n)");
	ctx.seedPinned = true;
}
