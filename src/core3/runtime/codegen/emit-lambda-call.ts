/**
 * A user-lambda read, called exactly as the interpreter calls it: as a method
 * of its slot (same `this`), with the slot's persistent state.
 */

export function emitLambdaCall(slot: string): string {
	return `${slot}.fn(${slot}.state, sr, time)`;
}
