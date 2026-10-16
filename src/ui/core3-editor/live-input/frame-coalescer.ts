/**
 * Coalesce many slot writes in one animation frame into a single flush: a
 * drag can post a write per pointermove, but the engine and the doc should
 * see at most one batch and one transaction per frame. `push` records the
 * latest value per slot index (later calls in the same frame overwrite
 * earlier ones); the scheduled flush hands the whole batch to `onFlush`
 * once, then clears it. The frame scheduler is injected so this stays
 * testable without a real animation frame.
 */

export interface FrameScheduler {
	readonly schedule: (callback: () => void) => void;
}

export const rafScheduler: FrameScheduler = {
	schedule: (callback) => requestAnimationFrame(callback),
};

export class FrameCoalescer {
	private readonly pending = new Map<number, number>();
	private readonly scheduler: FrameScheduler;
	private readonly onFlush: (writes: ReadonlyMap<number, number>) => void;
	private scheduled = false;

	constructor(onFlush: (writes: ReadonlyMap<number, number>) => void, scheduler: FrameScheduler = rafScheduler) {
		this.onFlush = onFlush;
		this.scheduler = scheduler;
	}

	push(slotIndex: number, value: number): void {
		this.pending.set(slotIndex, value);
		if (this.scheduled) return;
		this.scheduled = true;
		this.scheduler.schedule(() => this.flush());
	}

	private flush(): void {
		this.scheduled = false;
		if (this.pending.size === 0) return;
		const writes = new Map(this.pending);
		this.pending.clear();
		this.onFlush(writes);
	}
}
