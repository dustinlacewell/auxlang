/**
 * Every identifier the generator invents comes from here — never from a
 * user port, module, field or local name. Value slots have fixed names
 * (`v12` is slot 12's current value, `z12` its previous-sample value); every
 * other local, label and pasted helper is `_<n>`. Neither form can collide
 * with the driver's own names (bufs, outL, outR, offset, n, count, sr, k,
 * time, cur, prv) or with phase-1 names (T0, S0_0, a tick factory F0 and
 * its lane instances K0_0, ...).
 */

export class NameTable {
	private next = 0;

	fresh(): string {
		return `_${this.next++}`;
	}
}

/** The local holding slot `slot`'s value for the current sample. */
export function slotLocal(slot: number): string {
	return `v${slot}`;
}

/** The local holding slot `slot`'s value from the previous sample (a "z" read). */
export function prevLocal(slot: number): string {
	return `z${slot}`;
}
