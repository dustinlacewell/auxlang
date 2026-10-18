/**
 * Main-thread audio host: owns the AudioContext + AudioWorkletNode pair and
 * the worklet's message port. `play(program)` prepares the program here
 * (prepare/prepare-wasm-program.ts: the re-eval match against the last
 * program played, and the compiled and warmed WASM module) and posts it as
 * a swap; the worklet builds it while the old engine plays, then swaps and
 * crossfades. The worklet replies `swapped` or `error` per program
 * (posted-programs.ts): a program whose build failed is never the base of
 * the next prepare, and its slot writes are dropped. `stop()` silences it
 * and ends the session: the next play starts fresh.
 * The worklet bundle is
 * loaded via Vite's `?worker&url` import: Vite bundles it as a separate ES
 * module (worker.format) and returns its URL, in both dev and build. A bare
 * `?url` would ship the raw .ts source as an unbundled asset.
 */

import { getRegistry } from "../dsp/define";
import type { Program } from "../types";
import { withProgramSpecs } from "./hydrate-specs";
import { BUILD_BUDGET } from "./build/build-budget";
import { displayList } from "./live/display-list";
import type { DisplayWatch, MonitorFrame, SlotDecl, Watch } from "./live/live-contract";
import { MonitorReceiver } from "./live/monitor-receiver";
import { watchList } from "./live/watch-list";
import { PostedPrograms } from "./posted-programs";
import { prepareWasmProgram } from "./prepare/prepare-wasm-program";
import { type SeedSession, createSeedSession } from "./seed-session";
import workletUrl from "./worklet/index.ts?worker&url";
import type { PerfOverrun, PerfReport, WorkletMessage, WorkletReply } from "./worklet/messages";

/** A perf window with beat positions resolved main-thread, for UI/scraping. */
export interface PerfWindow extends PerfReport {
	readonly sampleRate: number;
	/** Per-overrun beat position + fraction (NaN when tempo unknown). */
	readonly beats: readonly { readonly beat: number; readonly frac: number }[];
}

/** Optional sink for structured perf windows (a harness page reads these). */
type PerfListener = (w: PerfWindow) => void;
let perfListener: PerfListener | null = null;

interface AudioHost {
	readonly context: AudioContext;
	readonly node: AudioWorkletNode;
}

let host: AudioHost | null = null;
// Beats/sec used to place overruns on the musical grid; set by enablePerf().
let perfBps = 0;
// The programs posted: the next one matches against the latest not failed and plans its carry from it.
const programs = new PostedPrograms();

async function ensureHost(): Promise<AudioHost> {
	if (host) return host;
	const context = new AudioContext();
	await context.audioWorklet.addModule(workletUrl);
	const node = new AudioWorkletNode(context, "core3-processor", {
		numberOfInputs: 0,
		numberOfOutputs: 1,
		outputChannelCount: [2],
	});
	node.port.onmessage = (e: MessageEvent<WorkletReply>) => {
		if (e.data.type === "swapped") programs.swapped(e.data.serial);
		if (e.data.type === "error") {
			buildFailed(e.data.serial);
			throw new Error(`core3 worklet: ${e.data.message}`);
		}
		if (e.data.type === "perf") reportPerf(e.data, context.sampleRate);
		if (e.data.type === "monitor") receiveFrame(e.data, node.port);
	};
	if (monitors.active) postMonitor(node.port, true);
	// An exception thrown INSIDE process() (not caught by swap's fence) kills the
	// processor without a message-port reply; surface it loudly instead of
	// letting the audio die in silence.
	node.onprocessorerror = (e: Event) => {
		console.error("core3 worklet: audio processor crashed — audio is dead until re-run", e);
	};
	node.connect(context.destination);
	host = { context, node };
	return host;
}

// Plays prepare one after another (a prepare awaits its compile and
// warm-up): each matches against the one before and posts in order.
let plays: Promise<void> = Promise.resolve();
// Counts stops: a play called before a stop is dropped, not posted after it.
let session = 0;

export function play(program: Program): Promise<void> {
	const at = session;
	const result = plays.then(() => playNext(program, at));
	plays = result.catch(() => {});
	return result;
}

async function playNext(program: Program, at: number): Promise<void> {
	const { context, node } = await ensureHost();
	if (context.state === "suspended") await context.resume();
	// A constant patch tempo feeds the perf beat grid; an explicit enablePerf(bpm)
	// still wins (perfBps is only overwritten here when we find a constant).
	const bpm = constantBpm(program);
	if (bpm > 0) perfBps = bpm / 60;
	const registry = withProgramSpecs(getRegistry(), program);
	const monitor = monitors.active;
	const prepared = await prepareWasmProgram(
		program,
		registry,
		context.sampleRate,
		programs.latest,
		BUILD_BUDGET,
		monitor,
	);
	if (at !== session) return;
	flushSlots();
	programs.posted(prepared);
	if (monitor) {
		monitors.posted(
			prepared.wasm.serial,
			watchList(prepared.program, registry),
			displayList(prepared.program, registry),
		);
	}
	const message: WorkletMessage = { type: "swap", prepared };
	node.port.postMessage(message);
}

/**
 * The play session's seed for patches that do not call `seed(n)`: drawn on
 * first use, kept across re-evals, ended by `stop()`. Eval with
 * `{ seed: playSeed.current() }`.
 */
export const playSeed: SeedSession = createSeedSession();

export function stop(): void {
	playSeed.end();
	dirtySlots.clear();
	programs.clear();
	session++;
	if (!host) return;
	const message: WorkletMessage = { type: "stop" };
	host.node.port.postMessage(message);
}

/**
 * Turn on render-quantum timing in the worklet (a0 diagnostic). Each ~1 s
 * window is logged as a console.table plus per-overrun beat positions, so
 * crackle can be correlated with cycle boundaries. Pass `bpm` to place
 * overruns on the beat grid; omitted, it is sniffed from the last played
 * program's clock node when that node's tempo is a constant.
 */
export async function enablePerf(bpm?: number, listener?: PerfListener): Promise<void> {
	// Dev-only diagnostic; a production build (import.meta.env.DEV === false)
	// folds this to an early return and the whole perf path tree-shakes away.
	if (!import.meta.env.DEV) return;
	const { node } = await ensureHost();
	if (bpm !== undefined) perfBps = bpm / 60;
	perfListener = listener ?? null;
	const message: WorkletMessage = { type: "perf", enabled: true };
	node.port.postMessage(message);
}

export function disablePerf(): void {
	perfListener = null;
	if (!host) return;
	const message: WorkletMessage = { type: "perf", enabled: false };
	host.node.port.postMessage(message);
}

// ---- Live channel (live/live-contract.ts). Stubs: the engine side fills them in. ----

// Slot writes since the last flush, by slot index, all for the program with
// serial `dirtySerial`; posted once per animation frame.
const dirtySlots = new Map<number, number>();
let dirtySerial = 0;
let slotPairs = new Float64Array(0);
let slotFlushQueued = false;

/**
 * Write a slot of the latest program posted and not failed (`currentSlots`);
 * coalesced to one message per animation frame.
 */
export function writeSlot(index: number, value: number): void {
	const target = programs.latest;
	if (host === null || target === undefined) return;
	if (target.wasm.serial !== dirtySerial) flushSlots();
	dirtySerial = target.wasm.serial;
	dirtySlots.set(index, value);
	if (slotFlushQueued) return;
	slotFlushQueued = true;
	requestAnimationFrame(flushSlots);
}

/** The slots writes target: the latest program posted and not failed (Program.liveSlots), [] when none. */
export function currentSlots(): readonly SlotDecl[] {
	return programs.latest?.program.liveSlots ?? [];
}

/** A build failed: the program before it is the base again; its unsent writes go. */
function buildFailed(serial: number): void {
	if (serial === dirtySerial) dirtySlots.clear();
	programs.failed(serial);
}

/**
 * Post the dirty slots as one SlotWrites, tagged with their program's
 * serial. The pairs buffer is reused; the message copies it (structured
 * clone), so nothing is transferred. Runs before a swap posts too, so writes
 * indexed by the old program land first.
 */
function flushSlots(): void {
	slotFlushQueued = false;
	if (host === null || dirtySlots.size === 0) return;
	if (slotPairs.length < 2 * dirtySlots.size) slotPairs = new Float64Array(2 * dirtySlots.size);
	let k = 0;
	for (const [index, value] of dirtySlots) {
		slotPairs[k++] = index;
		slotPairs[k++] = value;
	}
	dirtySlots.clear();
	const message: WorkletMessage = {
		type: "slots",
		serial: dirtySerial,
		writes: slotPairs.subarray(0, k),
	};
	host.node.port.postMessage(message);
}

// The editor's monitor listeners and the watches of each monitored program posted.
const monitors = new MonitorReceiver();

/**
 * Listen to monitor frames. The listener reads the frame synchronously; its
 * buffer goes back to the worklet when the listener returns. Returns an
 * unsubscribe function. The monitor runs only while a listener is attached:
 * programs played then are built with it. A program already playing
 * unmonitored when the first listener attaches is played again, monitored
 * (a re-eval of itself: its state carries on).
 */
export function onMonitor(
	listener: (frame: MonitorFrame, watches: readonly Watch[], displays: readonly DisplayWatch[]) => void,
): () => void {
	if (monitors.add(listener)) {
		if (host) postMonitor(host.node.port, true);
		const latest = programs.latest;
		if (latest !== undefined && !latest.monitor) void play(latest.program).catch(console.error);
	}
	return () => {
		if (monitors.remove(listener) && host) postMonitor(host.node.port, false);
	};
}

/**
 * The sample frame now leaving the speakers, on the AudioContext's frame
 * clock (the clock onset frames are on: worklet `currentFrame`):
 *
 *   frame = contextTime × sampleRate
 *
 * with contextTime from `getOutputTimestamp()`, else
 * `currentTime - outputLatency` where the browser has no output timestamp.
 * 0 before the audio host exists.
 */
export function audibleFrame(): number {
	if (!host) return 0;
	const { context } = host;
	const stamp =
		typeof context.getOutputTimestamp === "function"
			? context.getOutputTimestamp().contextTime
			: undefined;
	const time = stamp ?? context.currentTime - (context.outputLatency ?? 0);
	return time * context.sampleRate;
}

function postMonitor(port: MessagePort, enabled: boolean): void {
	const message: WorkletMessage = { type: "monitor", enabled };
	port.postMessage(message);
}

/** Hand the frame to the listeners, then its buffer back to the worklet. */
function receiveFrame(frame: MonitorFrame, port: MessagePort): void {
	try {
		monitors.receive(frame);
	} finally {
		const back: WorkletMessage = { type: "monitor-return", buffer: frame.buffer };
		port.postMessage(back, [frame.buffer]);
	}
}

/** Best-effort constant tempo of a program's clock node, else 0 (unknown). */
function constantBpm(program: Program): number {
	const clock = program.nodes.find((n) => n.module === "clock");
	const bpmSrc = clock?.lanes[0]?.bpm;
	return bpmSrc?.k === "c" ? bpmSrc.v : 0;
}

function reportPerf(report: PerfReport, sampleRate: number): void {
	const window = resolveWindow(report, sampleRate);
	logWindow(window);
	perfListener?.(window);
}

/** Attach beat positions to a raw report so consumers don't recompute them. */
function resolveWindow(report: PerfReport, sampleRate: number): PerfWindow {
	const beats = report.overruns.map((o) => beatOf(o, sampleRate));
	return { ...report, sampleRate, beats };
}

function beatOf(o: PerfOverrun, sampleRate: number): { beat: number; frac: number } {
	if (perfBps <= 0) return { beat: Number.NaN, frac: Number.NaN };
	const beat = (o.frame / sampleRate) * perfBps;
	return { beat, frac: beat - Math.floor(beat) };
}

function logWindow(w: PerfWindow): void {
	console.table({
		clock: w.clock,
		"quanta/window": w.quanta,
		"mean (ms)": round3(w.mean),
		"p99 (ms)": round3(w.p99),
		"max (ms)": round3(w.max),
		"budget (ms)": w.budget,
		overruns: w.overruns.length,
	});
	if (w.overruns.length === 0) return;
	console.table(
		w.overruns.map((o, i) => ({
			"elapsed (ms)": round3(o.elapsed),
			frame: o.frame,
			"time (s)": round3(o.frame / w.sampleRate),
			beat: fmtBeat((w.beats[i] as { beat: number }).beat),
			"beat frac": fmtBeat((w.beats[i] as { frac: number }).frac),
		})),
	);
}

const fmtBeat = (n: number): number | string => (Number.isNaN(n) ? "?" : round3(n));
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
