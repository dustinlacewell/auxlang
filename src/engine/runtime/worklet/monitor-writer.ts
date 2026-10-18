/**
 * The worklet's side of the monitor transport (live/live-contract.ts). Two
 * buffers ping-pong with the editor: every `ceil(sampleRate / 128 / 60)`
 * blocks the live engine's region (live/monitor-region.ts) and display
 * buffers (live/display-source.ts) are copied into a free buffer, posted as
 * a MonitorFrame transferring it, and restarted. The editor's MonitorReturn
 * gives the buffer back. With no free buffer the frame is skipped and the
 * region keeps accumulating into the next one.
 *
 * Nothing is allocated in `afterBlock` but the posted message itself:
 * buffers are made by `enable`, `reserve` and `giveBack`, which run in the
 * message handler, never in `process`. A buffer smaller than the reserved
 * size is replaced when it comes back.
 *
 * `generation` is the serial of the program whose engine filled the frame
 * (prepare/wasm-prepared.ts): it moves on with every swap, and the editor
 * finds the frame's program, and its watches, by it.
 */

import type { DisplaySource } from "../live/display-source";
import type { MonitorFrame } from "../live/live-contract";
import { type MonitorRegion, copyFrame, frameWords, startFrame } from "../live/monitor-region";

/** Where frames go: the worklet's port. */
export interface MonitorPort {
	postMessage(frame: MonitorFrame, transfer: Transferable[]): void;
}

/** How a buffer is made (a test counts them). */
export type BufferAlloc = (bytes: number) => ArrayBuffer;

const BUFFERS = 2;
const FRAMES_PER_SECOND = 60;
const QUANTUM = 128;

interface Free {
	readonly buffer: ArrayBuffer;
	readonly words: Float64Array;
}

export class MonitorWriter {
	private readonly blocksPerFrame: number;
	private enabled = false;
	private blocks = 0;
	/** Words each buffer holds. */
	private capacity = 0;
	/** Buffers made: free plus lent to the editor. */
	private made = 0;
	private readonly free: Free[] = [];

	constructor(
		private readonly port: MonitorPort,
		sampleRate: number,
		private readonly alloc: BufferAlloc = (bytes) => new ArrayBuffer(bytes),
	) {
		this.blocksPerFrame = Math.ceil(sampleRate / QUANTUM / FRAMES_PER_SECOND);
	}

	/** Start or stop posting frames; starting makes the two buffers when there are none. */
	enable(on: boolean): void {
		this.enabled = on;
		this.blocks = 0;
		while (on && this.made < BUFFERS) {
			this.free.push(this.make());
			this.made++;
		}
	}

	/** Size the buffers for a program of `watches` watches and `displayWords` of display data (on its swap message, before it plays). */
	reserve(watches: number, displayWords: number): void {
		const words = frameWords(watches) + displayWords;
		if (words <= this.capacity) return;
		this.capacity = words;
		for (let k = 0; k < this.free.length; k++) this.free[k] = this.make();
	}

	/** A buffer the editor has read (MonitorReturn). */
	giveBack(buffer: ArrayBuffer): void {
		const fits = buffer.byteLength >= 8 * this.capacity;
		this.free.push(fits ? { buffer, words: new Float64Array(buffer) } : this.make());
	}

	/**
	 * After each block: `region` is the live engine's (null when it has none),
	 * `displays` its display buffers, `serial` its program's, `frame` the
	 * AudioContext frame after the block.
	 */
	afterBlock(region: MonitorRegion | null, displays: DisplaySource, serial: number, frame: number): void {
		if (!this.enabled || region === null) return;
		if (++this.blocks < this.blocksPerFrame) return;
		this.blocks = 0;
		const total = frameWords(region.watches) + displays.words;
		if (total > this.capacity) return;
		const free = this.free.pop();
		if (free === undefined) return;
		const onsetCount = copyFrame(region, free.words);
		startFrame(region);
		displays.copyInto(free.words, frameWords(region.watches));
		const message: MonitorFrame = {
			type: "monitor",
			generation: serial,
			frame,
			levelCount: region.watches,
			onsetCount,
			buffer: free.buffer,
		};
		this.port.postMessage(message, [free.buffer]);
	}

	private make(): Free {
		const buffer = this.alloc(8 * this.capacity);
		return { buffer, words: new Float64Array(buffer) };
	}
}
