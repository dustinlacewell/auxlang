/**
 * Compare audio events vs highlight positions for a sequencer pattern.
 * Useful for debugging sync between what plays and what highlights.
 *
 * Usage:
 *   npx tsx src/tools/seq-compare.ts "c4 e4 g4"
 *   npx tsx src/tools/seq-compare.ts "<c4 d4> e4" --cycles 4
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { countBeats } from "@/core2/devices/seq/traverse/count-beats";
import { collectBeatEvents } from "@/core2/devices/seq/visitors/collect-events";
import { extractPositionsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

function freqToNote(freq: number): string {
	const notes = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
	const a4 = 440;
	const semitones = Math.round(12 * Math.log2(freq / a4));
	const noteIndex = ((semitones % 12) + 12 + 9) % 12;
	const octave = Math.floor((semitones + 9) / 12) + 4;
	return `${notes[noteIndex]}${octave}`;
}

function arraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

// CLI
const args = process.argv.slice(2);
const pattern = args.find((a) => !a.startsWith("--")) || "c4 e4 g4";
const cycles = args.includes("--cycles")
	? parseInt(args[args.indexOf("--cycles") + 1] || "2")
	: 2;

try {
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);
	const monos = decomposePattern(expr, "isolate");

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${totalBeats}, Voices: ${monos.length}`);
	console.log("");

	let matches = 0;
	let mismatches = 0;

	// Create one state per voice + one for highlight extraction
	const voiceStates = monos.map(() => createTraversalState());
	const highlightState = createTraversalState();

	for (let cycle = 0; cycle < cycles; cycle++) {
		console.log(`=== Cycle ${cycle} ===`);
		for (let beat = 0; beat < totalBeats; beat++) {
			// Audio events
			const audioNotes: string[] = [];
			for (let v = 0; v < monos.length; v++) {
				const voiceEvents = collectBeatEvents(monos[v]!, beat, voiceStates[v]!, cycle);
				for (const e of voiceEvents) {
					if (e.freq) audioNotes.push(freqToNote(e.freq));
				}
			}

			// Highlight positions
			const positions = extractPositionsForBeat(expr, pattern, beat, cycle, highlightState);
			const highlights = positions
				.filter((p) => p.type === "note")
				.map((p) => pattern.slice(p.start, p.end));

			const match = arraysEqual(audioNotes.sort(), highlights.sort());
			const status = match ? "✓" : "✗";

			if (match) matches++;
			else mismatches++;

			console.log(
				`  Beat ${beat}: audio=[${audioNotes.join(",")}] highlight=[${highlights.join(",")}] ${status}`
			);
		}
		console.log("");
	}

	console.log(`Summary: ${matches} matches, ${mismatches} mismatches`);
	if (mismatches > 0) {
		process.exit(1);
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
