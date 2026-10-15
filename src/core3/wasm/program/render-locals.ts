/**
 * The render function keeps the program's hot values in locals (MANIFESTO
 * §8, "state in locals"): each value slot, state field, output record field
 * and tick cache slot mirrors one f64 in memory. A mirror is made on first
 * use; render loads every mirror before its sample loop and stores it after.
 */

import type { FnEmitter } from "../compile/fn-emitter";

export interface Mirror {
	readonly local: number;
	readonly addr: number;
}

export class RenderLocals {
	private readonly byAddr = new Map<number, number>();
	readonly mirrors: Mirror[] = [];

	constructor(private readonly e: FnEmitter) {}

	/** The local mirroring the f64 at `addr`. */
	at(addr: number): number {
		const known = this.byAddr.get(addr);
		if (known !== undefined) return known;
		const local = this.e.local("f64");
		this.byAddr.set(addr, local);
		this.mirrors.push({ local, addr });
		return local;
	}
}
