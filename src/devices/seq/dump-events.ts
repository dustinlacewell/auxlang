/**
 * Debug script to dump event timings from a pattern.
 * Run with: npx tsx src/devices/seq/dump-events.ts
 */

import { parseExpr } from "./expr/parse";
import { countBeats, createTraversalState, traverse } from "./expr/traverse";
import type { Expr } from "./expr/types";
import { voiceCount } from "./expr/types";

// Target: 16 events at 0.5-beat intervals over 8 beats
// Notes: F F F G C C C D D D D D D D D D
// Durations: short short full full | short full full short full full | short full full short full full
// Short = 0.25, Full = 0.5
//
// The [x ~] pattern creates a short note (x takes 0.25, ~ takes 0.25)
// A plain note takes the full 0.5
//
// So we need: [f ~] [f ~] f g | [c ~] c c | [d ~] d d | [d ~] d d | [d ~] d d
// That's 16 slots (each 0.5 beats) = 8 beats
// Use a group of 16 items stretched to 8 beats

// Test all patterns
const kick = "c1!2 [c1*4]!2 c1!4";
const hihat = "~ c1 ~ c1 ~ c1 ~ c1";
const bass =
	"[<[[f2 ~] [f2 ~] f2 g2] [[g2 ~] [g2 ~] g2 g2]>@4 [c2 ~] c2 c2 [d2 ~] d2 d2 [d2 ~] d2 d2 [d2 ~] d2 d2]@8";

console.log("Kick beats:", countBeats(parseExpr(kick)));
console.log("Hihat beats:", countBeats(parseExpr(hihat)));
console.log("Bass beats:", countBeats(parseExpr(bass)));

const pattern = hihat;

const expr = parseExpr(pattern);
const totalBeats = countBeats(expr);
const voices = voiceCount(expr);

console.log("Pattern:", pattern);
console.log("Total beats:", totalBeats);
console.log("Voices:", voices);
console.log("\nAST:", JSON.stringify(expr, null, 2));
console.log("\n--- Events (cycle 0) ---");

const state = createTraversalState();

// Sample at high resolution to find event boundaries
const resolution = 100; // samples per beat
const events: Array<{ start: number; end: number; note: string; freq: number }> = [];
let currentEvent: { start: number; note: string; freq: number } | null = null;

for (let beat = 0; beat < totalBeats; beat++) {
	for (let phase = 0; phase < resolution; phase++) {
		const p = phase / resolution;
		const output = traverse(
			expr,
			{
				beatIndex: beat,
				phase: p,
				cycle: 0,
				totalBeats,
			},
			state,
		);

		const cv = output.cv[0]?.value ?? 0;
		const gate = output.gate[0]?.value ?? 0;

		if (gate > 0 && !currentEvent) {
			// Note on
			currentEvent = {
				start: beat + p,
				freq: cv,
				note: freqToNote(cv),
			};
		} else if (gate === 0 && currentEvent) {
			// Note off
			events.push({
				...currentEvent,
				end: beat + p,
			});
			currentEvent = null;
		}
	}
}

// Close any open event
if (currentEvent) {
	events.push({
		...currentEvent,
		end: totalBeats,
	});
}

// Print in same format as Strudel
for (const e of events) {
	console.log(e.start.toFixed(4), e.end.toFixed(4), e.note, `(${e.freq.toFixed(1)} Hz)`);
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
