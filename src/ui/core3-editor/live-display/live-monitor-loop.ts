/**
 * One shared subscription to the engine's monitor channel (runtime/audio.ts
 * onMonitor) for the pattern-highlight extension — "the monitor runs only
 * while a listener is attached" (live-contract.ts), so the last unsubscribe
 * really does turn it off.
 *
 * Each subscriber's callback runs on the next requestAnimationFrame with the
 * latest snapshot (frame-store.ts: copied synchronously inside the engine's
 * listener, per live-contract.ts). Rendering itself — CodeMirror decoration
 * rebuilds — happens there, off the monitor's own synchronous callback.
 */

import { onMonitor } from "@/core3/runtime/audio";
import type { MonitorFrame } from "@/core3/runtime/live/live-contract";
import { type FrameSnapshot, createFrameStore } from "./frame-store";

type FrameListener = (snapshot: FrameSnapshot) => void;

const store = createFrameStore();
const subscribers = new Set<FrameListener>();
let pending: FrameSnapshot | null = null;
let rafId: number | null = null;
let unsubscribeMonitor: (() => void) | null = null;

function flush(): void {
	rafId = null;
	if (pending === null) return;
	const snapshot = pending;
	pending = null;
	for (const listener of subscribers) listener(snapshot);
}

/** Adds a subscriber to the shared monitor tick; returns its unsubscribe. */
export function watchMonitor(onTick: FrameListener): () => void {
	subscribers.add(onTick);
	unsubscribeMonitor ??= onMonitor((frame: MonitorFrame) => {
		pending = store.copyFrom(frame);
		rafId ??= requestAnimationFrame(flush);
	});

	return () => {
		subscribers.delete(onTick);
		if (subscribers.size > 0) return;
		unsubscribeMonitor?.();
		unsubscribeMonitor = null;
		if (rafId !== null) cancelAnimationFrame(rafId);
		rafId = null;
		pending = null;
	};
}
