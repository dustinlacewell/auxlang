/**
 * The main thread's side of the monitor transport (live-contract.ts): the
 * editor's listeners, and the watches and displays of each monitored
 * program posted to the worklet, by serial. A frame's generation is the
 * serial of the program that filled it (worklet/monitor-writer.ts); a frame
 * older than the latest one seen is dropped, and so are the programs older
 * than that. The audio host (audio.ts) posts each frame's buffer back after
 * `receive`.
 */

import type { DisplayWatch, MonitorFrame, Watch } from "./live-contract";

export type MonitorListener = (
	frame: MonitorFrame,
	watches: readonly Watch[],
	displays: readonly DisplayWatch[],
) => void;

interface Posted {
	readonly watches: readonly Watch[];
	readonly displays: readonly DisplayWatch[];
}

export class MonitorReceiver {
	private readonly listeners = new Set<MonitorListener>();
	private readonly programs = new Map<number, Posted>();
	private latest = 0;

	/** True while at least one listener is attached: programs are prepared monitored. */
	get active(): boolean {
		return this.listeners.size > 0;
	}

	/** Attach a listener; true when it is the first. */
	add(listener: MonitorListener): boolean {
		this.listeners.add(listener);
		return this.listeners.size === 1;
	}

	/** Detach a listener; true when it was the last. */
	remove(listener: MonitorListener): boolean {
		return this.listeners.delete(listener) && this.listeners.size === 0;
	}

	/** A monitored program posted to the worklet, with its watches (watch-list.ts) and displays (display-list.ts). */
	posted(serial: number, watches: readonly Watch[], displays: readonly DisplayWatch[]): void {
		this.programs.set(serial, { watches, displays });
	}

	/** Hand a frame to every listener, synchronously, unless it is stale or its program unknown. */
	receive(frame: MonitorFrame): void {
		if (frame.generation < this.latest) return;
		this.latest = frame.generation;
		for (const serial of this.programs.keys()) if (serial < frame.generation) this.programs.delete(serial);
		const posted = this.programs.get(frame.generation);
		if (posted === undefined) return;
		for (const listener of this.listeners) listener(frame, posted.watches, posted.displays);
	}
}
