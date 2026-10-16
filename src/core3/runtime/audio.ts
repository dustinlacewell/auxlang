/**
 * Main-thread audio host: owns the AudioContext + AudioWorkletNode pair and
 * the worklet's message port. `play(program)` prepares the program here
 * (prepare/prepare-wasm-program.ts: the re-eval match against the last
 * program played, and the compiled and warmed WASM module) and posts it as
 * a swap; the worklet builds it while the old engine plays, then swaps and
 * crossfades. `stop()` silences it and ends the session: the next play
 * starts fresh.
 * The worklet bundle is
 * loaded via Vite's `?worker&url` import: Vite bundles it as a separate ES
 * module (worker.format) and returns its URL, in both dev and build. A bare
 * `?url` would ship the raw .ts source as an unbundled asset.
 */

import { getRegistry } from "../module/define";
import type { Program } from "../types";
import { withProgramSpecs } from "./hydrate-specs";
import type { MonitorFrame, SlotDecl, Watch } from "./live/live-contract";
import type { HostPrepared } from "./prepare/host-prepared";
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
// The last program played: the next one matches against it and plans its carry from it.
let running: HostPrepared | undefined;

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
		if (e.data.type === "error") throw new Error(`core3 worklet: ${e.data.message}`);
		if (e.data.type === "perf") reportPerf(e.data, context.sampleRate);
	};
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
	const prepared = await prepareWasmProgram(program, registry, context.sampleRate, running);
	if (at !== session) return;
	flushSlots();
	running = prepared;
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
	running = undefined;
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

// Slot writes since the last flush, by slot index; posted once per animation frame.
const dirtySlots = new Map<number, number>();
let slotPairs = new Float64Array(0);
let slotFlushQueued = false;

/** Write a slot of the playing program; coalesced to one message per animation frame. */
export function writeSlot(index: number, value: number): void {
	if (host === null || running === undefined) return;
	dirtySlots.set(index, value);
	if (slotFlushQueued) return;
	slotFlushQueued = true;
	requestAnimationFrame(flushSlots);
}

/** The slots of the last program played (Program.liveSlots), [] when none. */
export function currentSlots(): readonly SlotDecl[] {
	return running?.program.liveSlots ?? [];
}

/**
 * Post the dirty slots as one SlotWrites. The pairs buffer is reused; the
 * message copies it (structured clone), so nothing is transferred. Runs
 * before a swap posts too, so writes indexed by the old program land first.
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
	const message: WorkletMessage = { type: "slots", writes: slotPairs.subarray(0, k) };
	host.node.port.postMessage(message);
}

/**
 * Listen to monitor frames. The listener reads the frame synchronously; its
 * buffer goes back to the worklet when the listener returns. Returns an
 * unsubscribe function. The monitor runs only while a listener is attached.
 */
export function onMonitor(
	_listener: (frame: MonitorFrame, watches: readonly Watch[]) => void,
): () => void {
	return () => {};
}

/** The engine sample frame now leaving the speakers (AudioContext output timestamp). */
export function audibleFrame(): number {
	return 0;
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
