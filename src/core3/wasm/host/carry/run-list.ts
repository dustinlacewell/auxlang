/**
 * Collects the carry plan's runs (carry-run.ts) from byte addresses. A run
 * that continues the last one (same type, both sides contiguous) extends it,
 * so a lane whose fields keep their order copies as a few long runs. A
 * `CARRY_REL` address `from` counts from the current base (carry-run.ts).
 */

import { CARRY_DEREF, CARRY_F64, CARRY_POP, CARRY_REL, CARRY_WORD, type CarryType } from "./carry-run";

const UNIT_BYTES: Readonly<Record<CarryType, number>> = {
	[CARRY_F64]: 8,
	[CARRY_WORD]: 4,
	[CARRY_REL]: 4,
};

export class RunList {
	private readonly runs: number[] = [];

	/** Copy `bytes` from old address `from` to new address `to`, in `type`'s units. */
	add(from: number, to: number, bytes: number, type: CarryType): void {
		if (bytes === 0) return;
		const unit = UNIT_BYTES[type];
		const [src, dst, count] = [from / unit, to / unit, bytes / unit];
		const n = this.runs.length;
		const extends_ =
			n > 0 &&
			this.runs[n - 1] === type &&
			(this.runs[n - 4] as number) + (this.runs[n - 2] as number) === src &&
			(this.runs[n - 3] as number) + (this.runs[n - 2] as number) === dst;
		if (extends_) this.runs[n - 2] = (this.runs[n - 2] as number) + count;
		else this.runs.push(src, dst, count, type);
	}

	/** Read from where the old slot at byte `slot` (from the current base) points, until `pop`. */
	deref(slot: number): void {
		this.runs.push(slot / 4, 0, 0, CARRY_DEREF);
	}

	pop(): void {
		this.runs.push(0, 0, 0, CARRY_POP);
	}

	toArray(): Int32Array {
		return Int32Array.from(this.runs);
	}
}
