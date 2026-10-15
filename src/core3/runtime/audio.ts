/**
 * Main-thread audio host: owns the AudioContext + AudioWorkletNode pair and
 * the worklet's message port. `play(program)` posts a swap (the worklet
 * crossfades and migrates state); `stop()` silences it. The worklet bundle is
 * loaded via Vite's `?worker&url` import: Vite bundles it as a separate ES
 * module (worker.format) and returns its URL, in both dev and build. A bare
 * `?url` would ship the raw .ts source as an unbundled asset.
 */

import type { Program } from "../types";
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

export async function play(program: Program): Promise<void> {
	const { context, node } = await ensureHost();
	if (context.state === "suspended") await context.resume();
	// A constant patch tempo feeds the perf beat grid; an explicit enablePerf(bpm)
	// still wins (perfBps is only overwritten here when we find a constant).
	const bpm = constantBpm(program);
	if (bpm > 0) perfBps = bpm / 60;
	const message: WorkletMessage = { type: "swap", program };
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
