/**
 * Dev tools for debugging seq patterns - timeline, voices, highlighting.
 * 
 * Usage:
 *   npx tsx src/tools/seq-debug.ts "{c4 c3, e4 f4}"
 *   npx tsx src/tools/seq-debug.ts "c4 e4 g4" --cycles 2
 *   npx tsx src/tools/seq-debug.ts "[c4 e4] g4" --sub-beats
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import { decomposePattern } from "@/core2/devices/seq/expr/types";
import { countBeats } from "@/core2/devices/seq/expr/traverse";
import { collectBeatEvents } from "@/core2/devices/seq/cursor/collect-events";
import { extractPositionsForBeat } from "@/core2/devices/seq/extract-beat-positions";
import { pitchToFreq } from "@/core2/devices/seq/expr/pitch-to-freq";

interface DebugOptions {
	cycles?: number;
	subBeats?: boolean;
	showFreq?: boolean;
}

/**
 * Dump voice decomposition info
 */
export function dumpVoices(pattern: string): void {
	const expr = parseExpr(pattern);
	const monos = decomposePattern(expr, "isolate");

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${countBeats(expr)}`);
	console.log(`Voices: ${monos.length}`);
	console.log("");

	for (let i = 0; i < monos.length; i++) {
		const mono = monos[i]!;
		console.log(`Voice ${i}: type=${mono.type}, beats=${countBeats(mono)}`);
	}
}

/**
 * Dump what plays at each beat/cycle
 */
export function dumpTimeline(pattern: string, options: DebugOptions = {}): void {
	const { cycles = 2, subBeats = false, showFreq = false } = options;
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);
	const monos = decomposePattern(expr, "isolate");

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${totalBeats}, Voices: ${monos.length}`);
	console.log("");

	const step = subBeats ? 0.5 : 1;

	for (let cycle = 0; cycle < cycles; cycle++) {
		console.log(`=== Cycle ${cycle} ===`);
		for (let beat = 0; beat < totalBeats; beat += step) {
			const events: string[] = [];
			const probDecisions: Record<string, boolean> = {};

			for (let v = 0; v < monos.length; v++) {
				const voiceEvents = collectBeatEvents(monos[v]!, beat, probDecisions, cycle);
				for (const e of voiceEvents) {
					if (e.freq) {
						const note = freqToNote(e.freq);
						events.push(showFreq ? `${note}(${Math.round(e.freq)})` : note);
					}
				}
			}

			if (events.length > 0) {
				console.log(`  Beat ${beat}: ${events.join(", ")}`);
			} else {
				console.log(`  Beat ${beat}: (rest)`);
			}
		}
		console.log("");
	}
}

/**
 * Dump highlighting positions at each beat/cycle
 */
export function dumpHighlights(pattern: string, options: DebugOptions = {}): void {
	const { cycles = 2, subBeats = false } = options;
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${totalBeats}`);
	console.log("");

	const step = subBeats ? 0.5 : 1;

	for (let cycle = 0; cycle < cycles; cycle++) {
		console.log(`=== Cycle ${cycle} ===`);
		for (let beat = 0; beat < totalBeats; beat += step) {
			const positions = extractPositionsForBeat(expr, pattern, beat, cycle);
			const highlights = positions.map(p => pattern.slice(p.start, p.end));

			if (highlights.length > 0) {
				console.log(`  Beat ${beat}: ${highlights.join(", ")}`);
			} else {
				console.log(`  Beat ${beat}: (none)`);
			}
		}
		console.log("");
	}
}

/**
 * Compare audio events vs highlight positions
 */
export function dumpComparison(pattern: string, options: DebugOptions = {}): void {
	const { cycles = 2 } = options;
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);
	const monos = decomposePattern(expr, "isolate");

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${totalBeats}, Voices: ${monos.length}`);
	console.log("");

	for (let cycle = 0; cycle < cycles; cycle++) {
		console.log(`=== Cycle ${cycle} ===`);
		for (let beat = 0; beat < totalBeats; beat++) {
			const probDecisions: Record<string, boolean> = {};

			// Audio events
			const audioNotes: string[] = [];
			for (let v = 0; v < monos.length; v++) {
				const voiceEvents = collectBeatEvents(monos[v]!, beat, probDecisions, cycle);
				for (const e of voiceEvents) {
					if (e.freq) audioNotes.push(freqToNote(e.freq));
				}
			}

			// Highlight positions
			const positions = extractPositionsForBeat(expr, pattern, beat, cycle);
			const highlights = positions
				.filter(p => p.type === "note")
				.map(p => pattern.slice(p.start, p.end));

			const match = arraysEqual(audioNotes.sort(), highlights.sort()) ? "✓" : "✗";
			console.log(`  Beat ${beat}: audio=[${audioNotes.join(",")}] highlight=[${highlights.join(",")}] ${match}`);
		}
		console.log("");
	}
}

// Helper: freq to note name (approximate)
function freqToNote(freq: number): string {
	const notes = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
	const a4 = 440;
	const semitones = Math.round(12 * Math.log2(freq / a4));
	const noteIndex = ((semitones % 12) + 12 + 9) % 12; // A4 is index 9
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

// CLI - run when executed directly
const isMain = process.argv[1]?.endsWith("seq-debug.ts");
if (isMain) {
	const args = process.argv.slice(2);
	const pattern = args.find(a => !a.startsWith("--")) || "{c4 c3, e4 f4}";
	const cycles = args.includes("--cycles") ? parseInt(args[args.indexOf("--cycles") + 1] || "2") : 2;
	const subBeats = args.includes("--sub-beats");
	const showFreq = args.includes("--freq");
	const mode = args.includes("--voices") ? "voices" 
		: args.includes("--highlights") ? "highlights"
		: args.includes("--compare") ? "compare"
		: "timeline";

	const options = { cycles, subBeats, showFreq };

	switch (mode) {
		case "voices":
			dumpVoices(pattern);
			break;
		case "highlights":
			dumpHighlights(pattern, options);
			break;
		case "compare":
			dumpComparison(pattern, options);
			break;
		default:
			dumpTimeline(pattern, options);
	}
}
