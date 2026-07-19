/**
 * Perf harness page (vanilla). Plays an EXAMPLE patch through the real
 * worklet, turns on the render-quantum meter, and mirrors each ~1 s PerfWindow
 * three ways so it can be read by eye or scraped headlessly via CDP:
 *   - a live summary + overruns table on the page,
 *   - window.__perf (an array of every window received),
 *   - a `[PERF] {json}` console line per window (easy Runtime.consoleAPICalled).
 * This is a diagnostic surface only — it reuses evalPatch/play/enablePerf, adds
 * no engine behavior.
 */

import { type PerfWindow, disablePerf, enablePerf, play, stop } from "@/core3/runtime/audio";
import { EXAMPLES } from "@/ui/core3-editor/examples";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

declare global {
	interface Window {
		__perf: PerfWindow[];
	}
}
window.__perf = [];

function el<T extends HTMLElement>(sel: string): T {
	const found = document.querySelector<T>(sel);
	if (!found) throw new Error(`core3-perf: page markup is missing ${sel}`);
	return found;
}

const patchSel = el<HTMLSelectElement>("#patch");
const bpmInput = el<HTMLInputElement>("#bpm");
const startBtn = el<HTMLButtonElement>("#start");
const stopBtn = el<HTMLButtonElement>("#stop");
const statusEl = el<HTMLDivElement>("#status");
const errEl = el<HTMLDivElement>("#error");
const summaryEl = el<HTMLDivElement>("#summary");
const overrunsEl = el<HTMLDivElement>("#overruns");

for (const ex of EXAMPLES) {
	const opt = document.createElement("option");
	opt.value = ex.name;
	opt.textContent = ex.name;
	patchSel.append(opt);
}
patchSel.value = "coastline (after eddyflux)";

function showError(message: string): void {
	errEl.textContent = message;
	errEl.style.display = "block";
}

function receive(w: PerfWindow): void {
	window.__perf.push(w);
	console.log("[PERF]", JSON.stringify(w));
	renderSummary(w);
	renderOverruns(w);
	statusEl.textContent = `running — ${window.__perf.length} windows captured`;
}

async function start(): Promise<void> {
	errEl.style.display = "none";
	window.__perf = [];
	const source = EXAMPLES.find((e) => e.name === patchSel.value)?.source;
	if (source === undefined) return showError(`no such example: ${patchSel.value}`);
	try {
		const program = evalPatch(source);
		await play(program);
		const bpm = bpmInput.value.trim() === "" ? undefined : Number(bpmInput.value);
		await enablePerf(bpm, receive);
		statusEl.textContent = "running — waiting for first window (~1 s)…";
	} catch (err) {
		showError(err instanceof Error ? err.message : String(err));
	}
}

function halt(): void {
	disablePerf();
	stop();
	statusEl.textContent = `stopped — ${window.__perf.length} windows captured (in window.__perf)`;
}

startBtn.addEventListener("click", () => void start());
stopBtn.addEventListener("click", halt);

// --- table rendering -------------------------------------------------------

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const beat = (n: number): string => (Number.isNaN(n) ? "?" : String(round3(n)));

function renderSummary(w: PerfWindow): void {
	summaryEl.innerHTML = table(
		["metric", "value"],
		[
			["clock", w.clock],
			["quanta/window", String(w.quanta)],
			["mean (ms)", String(round3(w.mean))],
			["p99 (ms)", String(round3(w.p99))],
			["max (ms)", String(round3(w.max))],
			["budget (ms)", String(w.budget)],
			["overruns", String(w.overruns.length)],
		],
	);
}

function renderOverruns(w: PerfWindow): void {
	if (w.overruns.length === 0) {
		overrunsEl.innerHTML = "<p>no overruns this window</p>";
		return;
	}
	const rows = w.overruns.map((o, i) => [
		String(round3(o.elapsed)),
		String(o.frame),
		String(round3(o.frame / w.sampleRate)),
		beat((w.beats[i] as { beat: number }).beat),
		beat((w.beats[i] as { frac: number }).frac),
	]);
	overrunsEl.innerHTML = table(
		["elapsed (ms)", "frame", "time (s)", "beat", "beat frac"],
		rows,
		true,
	);
}

function table(headers: string[], rows: string[][], warnRows = false): string {
	const head = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
	const body = rows
		.map(
			(r) => `<tr${warnRows ? ' class="warn"' : ""}>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`,
		)
		.join("");
	return `<table>${head}${body}</table>`;
}
