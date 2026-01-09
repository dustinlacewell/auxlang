/**
 * Compare Strudel and Auxlang pattern outputs side by side.
 *
 * Run with: npx tsx src/devices/seq/compare-strudel-aux.ts
 */

import { execSync } from "child_process";
import { parseExpr } from "./expr/parse";
import { countBeats, createTraversalState, traverse } from "./expr/traverse";
import { voiceCount } from "./expr/types";

// ============= PATTERNS TO COMPARE =============
const strudelPattern = `<[[2 ~] [2 ~] 2 3] [[3 ~] [3 ~] 3 3]>@4 [-1 ~] -1 -1 [0 ~] 0 0 [0 ~] 0 0 [0 ~] 0 0`;
const strudelCycles = 8; // .slow(8) means query 0-8

const auxPattern = `[<[[f2 ~] [f2 ~] f2 g2] [[g2 ~] [g2 ~] g2 g2]>@4 [c2 ~] c2 c2 [d2 ~] d2 d2 [d2 ~] d2 d2 [d2 ~] d2 d2]@8`;

// ============= GET STRUDEL EVENTS =============
// Hardcoded from actual Strudel output (avoiding Windows exec issues)
function getStrudelEvents(): Array<{ start: number; end: number; value: number }> {
	return [
		{ start: 0.0000, end: 0.2500, value: 2 },
		{ start: 0.5000, end: 0.7500, value: 2 },
		{ start: 1.0000, end: 1.5000, value: 2 },
		{ start: 1.5000, end: 2.0000, value: 3 },
		{ start: 2.0000, end: 2.2500, value: -1 },
		{ start: 2.5000, end: 3.0000, value: -1 },
		{ start: 3.0000, end: 3.5000, value: -1 },
		{ start: 3.5000, end: 3.7500, value: 0 },
		{ start: 4.0000, end: 4.5000, value: 0 },
		{ start: 4.5000, end: 5.0000, value: 0 },
		{ start: 5.0000, end: 5.2500, value: 0 },
		{ start: 5.5000, end: 6.0000, value: 0 },
		{ start: 6.0000, end: 6.5000, value: 0 },
		{ start: 6.5000, end: 6.7500, value: 0 },
		{ start: 7.0000, end: 7.5000, value: 0 },
		{ start: 7.5000, end: 8.0000, value: 0 },
	];
}

// ============= GET AUX EVENTS =============
function getAuxEvents(): Array<{ start: number; end: number; note: string; freq: number }> {
	const expr = parseExpr(auxPattern);
	const totalBeats = countBeats(expr);
	const state = createTraversalState();

	const resolution = 100;
	const events: Array<{ start: number; end: number; note: string; freq: number }> = [];
	let currentEvent: { start: number; note: string; freq: number } | null = null;

	for (let beat = 0; beat < totalBeats; beat++) {
		for (let phase = 0; phase < resolution; phase++) {
			const p = phase / resolution;
			const output = traverse(
				expr,
				{ beatIndex: beat, phase: p, cycle: 0, totalBeats },
				state
			);

			const cv = output.cv[0]?.value ?? 0;
			const gate = output.gate[0]?.value ?? 0;
			const trig = output.trig[0]?.value ?? 0;

			// Use trigger to detect new notes (not gate transitions)
			if (trig > 0) {
				// Close previous event
				if (currentEvent) {
					events.push({ ...currentEvent, end: beat + p });
				}
				// Start new event
				currentEvent = { start: beat + p, freq: cv, note: freqToNote(cv) };
			} else if (gate === 0 && currentEvent) {
				// Gate off ends current event
				events.push({ ...currentEvent, end: beat + p });
				currentEvent = null;
			}
		}
	}

	if (currentEvent) {
		events.push({ ...currentEvent, end: totalBeats });
	}

	return events;
}

function freqToNote(freq: number): string {
	if (freq === 0) return "~";
	const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
	const midi = 12 * Math.log2(freq / 440) + 69;
	const note = Math.round(midi);
	const octave = Math.floor(note / 12) - 1;
	const name = noteNames[note % 12];
	return `${name}${octave}`;
}

// Scale degree to note name (D minor: D E F G A Bb C)
const scaleMap: Record<number, string> = {
	[-1]: "c2",
	[0]: "d2",
	[1]: "e2",
	[2]: "f2",
	[3]: "g2",
};

// ============= COMPARE =============
console.log("=== STRUDEL PATTERN ===");
console.log(strudelPattern);
console.log(`.slow(${strudelCycles})`);

console.log("\n=== AUX PATTERN ===");
console.log(auxPattern);

const strudelEvents = getStrudelEvents();
const auxEvents = getAuxEvents();

console.log("\n=== STRUDEL EVENTS ===");
console.log("Count:", strudelEvents.length);
for (const e of strudelEvents) {
	const note = scaleMap[e.value] ?? `?${e.value}`;
	console.log(`${e.start.toFixed(4)} - ${e.end.toFixed(4)}  ${note}  (dur: ${(e.end - e.start).toFixed(4)})`);
}

console.log("\n=== AUX EVENTS ===");
console.log("Count:", auxEvents.length);
for (const e of auxEvents) {
	console.log(`${e.start.toFixed(4)} - ${e.end.toFixed(4)}  ${e.note}  (dur: ${(e.end - e.start).toFixed(4)})`);
}

// ============= DIFF =============
console.log("\n=== COMPARISON ===");
const maxLen = Math.max(strudelEvents.length, auxEvents.length);
let matches = 0;
let mismatches = 0;

console.log("Beat     | Strudel          | Aux              | Match?");
console.log("---------|------------------|------------------|-------");

for (let i = 0; i < maxLen; i++) {
	const s = strudelEvents[i];
	const a = auxEvents[i];

	const sStr = s ? `${s.start.toFixed(2)} ${scaleMap[s.value] ?? "?"} (${(s.end - s.start).toFixed(2)})` : "---";
	const aStr = a ? `${a.start.toFixed(2)} ${a.note} (${(a.end - a.start).toFixed(2)})` : "---";

	const startMatch = s && a && Math.abs(s.start - a.start) < 0.01;
	const noteMatch = s && a && scaleMap[s.value] === a.note;
	const match = startMatch && noteMatch;

	if (match) matches++;
	else mismatches++;

	console.log(`${String(i).padStart(8)} | ${sStr.padEnd(16)} | ${aStr.padEnd(16)} | ${match ? "YES" : "NO"}`);
}

console.log(`\nMatches: ${matches}/${maxLen}, Mismatches: ${mismatches}`);
