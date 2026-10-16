/**
 * The live channel between the editor and the running engine, both ways.
 * Types only: the engine side (worklet, audio.ts, WASM) and the editor side
 * (CodeMirror extensions) build against this file.
 *
 * Editor -> engine: SLOTS. A slot is one f64 the editor writes while the
 * patch plays: no re-eval, no recompile, other state untouched. A control
 * module's value and a dragged number literal read a slot. Writes coalesce
 * to one message per animation frame.
 *
 * Engine -> editor: MONITOR FRAMES, about 60 per second. One frame holds a
 * level summary for every watched output and the seq note onsets since the
 * last frame. Two preallocated buffers ping-pong between the threads by
 * transfer; when the editor still holds both, the worklet skips the frame.
 * Nothing is allocated on the audio thread per frame.
 */

/** One slot the program reads: index = position in `Program.slots`. */
export interface SlotDecl {
	/** The source site the editor edits for this slot (a control call or a number literal). */
	readonly site: number;
	/** Value at eval: the literal or the control's initial value. */
	readonly init: number;
	/** Clamp range in the port's unit; absent for a dragged literal with no range. */
	readonly min?: number;
	readonly max?: number;
}

/** Editor -> worklet: dirty slots of one animation frame, pairs [slot index, value]. */
export interface SlotWrites {
	readonly type: "slots";
	readonly writes: Float64Array;
}

/** One output the monitor summarises: a node's default output, lane 0. */
export interface Watch {
	readonly node: number;
	readonly port: string;
	/** The site of the call that made the node (PNode.site). */
	readonly site: number;
	readonly module: string;
}

/** Per watched output, LEVEL_STRIDE f64s in this order. */
export const LEVEL_LAST = 0;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 2;
/** Max |x| over the frame. */
export const LEVEL_PEAK = 3;
/** Rising edges past 0.5 in the frame. */
export const LEVEL_HITS = 4;
export const LEVEL_STRIDE = 5;

/** Per onset, ONSET_STRIDE f64s: watch index of the seq, event site, sample frame. */
export const ONSET_WATCH = 0;
export const ONSET_SITE = 1;
export const ONSET_FRAME = 2;
export const ONSET_STRIDE = 3;
/** Onsets past this many in one frame are dropped (the count says how many were kept). */
export const ONSET_CAPACITY = 256;

/** Worklet -> editor. `buffer` is a Float64Array's buffer: levels, then onsets. */
export interface MonitorFrame {
	readonly type: "monitor";
	/** Counts swaps; a frame from an older program is ignored by the editor. */
	readonly generation: number;
	/** Engine sample frame at the end of the frame's last block. */
	readonly frame: number;
	readonly levelCount: number;
	readonly onsetCount: number;
	readonly buffer: ArrayBuffer;
}

/** Editor -> worklet: hand a read frame's buffer back for reuse. */
export interface MonitorReturn {
	readonly type: "monitor-return";
	readonly buffer: ArrayBuffer;
}
