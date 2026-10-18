/**
 * The main thread's view of the programs it posted to the worklet. The
 * worklet replies `swapped` when a program takes effect and `error` when its
 * build fails (worklet/messages.ts); both name the program's serial.
 *
 * - `playing`: the last program confirmed playing.
 * - `latest`: the last program posted that has not failed. The next prepare
 *   matches and plans its carry against it, and slot writes use its indices.
 *   When a build fails, `latest` falls back to the program posted before it,
 *   else to `playing`.
 *
 * Builds take effect in the order posted, so a `swapped` settles every
 * program posted before it. A reply for a serial not in flight (posted
 * before a `clear`) is ignored.
 */

import type { HostPrepared } from "./prepare/host-prepared";

export class PostedPrograms {
	private confirmed: HostPrepared | undefined;
	// Posted, neither swapped in nor failed yet; oldest first.
	private readonly inFlight: HostPrepared[] = [];

	get playing(): HostPrepared | undefined {
		return this.confirmed;
	}

	get latest(): HostPrepared | undefined {
		return this.inFlight[this.inFlight.length - 1] ?? this.confirmed;
	}

	posted(prepared: HostPrepared): void {
		this.inFlight.push(prepared);
	}

	swapped(serial: number): void {
		const at = this.indexOf(serial);
		if (at < 0) return;
		this.confirmed = this.inFlight[at];
		this.inFlight.splice(0, at + 1);
	}

	failed(serial: number): void {
		const at = this.indexOf(serial);
		if (at >= 0) this.inFlight.splice(at, 1);
	}

	/** Forget every program: a stop ends the session. */
	clear(): void {
		this.confirmed = undefined;
		this.inFlight.length = 0;
	}

	private indexOf(serial: number): number {
		return this.inFlight.findIndex((p) => p.wasm.serial === serial);
	}
}
