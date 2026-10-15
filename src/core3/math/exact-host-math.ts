/**
 * The `Math` functions a tick may call on the host as they are: each is an
 * exactly specified IEEE-754 or integer operation, so every engine (and the
 * WASM backend) gives the same bits. `Math.random` is not here: it is bound
 * to the module's seeded stream (tick-build/bind-random.ts).
 */
export const EXACT_HOST_MATH: ReadonlySet<string> = new Set([
	"abs",
	"ceil",
	"clz32",
	"floor",
	"fround",
	"imul",
	"max",
	"min",
	"round",
	"sign",
	"sqrt",
	"trunc",
]);
