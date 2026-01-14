/**
 * Show what plays at each beat in a sequencer pattern.
 *
 * Usage:
 *   npx tsx src/tools/seq-timeline.ts "c4 e4 g4"
 *   npx tsx src/tools/seq-timeline.ts "{c4, e4}" --cycles 4
 *   npx tsx src/tools/seq-timeline.ts "[c4 e4]*2" --sub-beats
 *   npx tsx src/tools/seq-timeline.ts "c4 e4" --freq
 *   npx tsx src/tools/seq-timeline.ts "{c4, e4}" --by-voice
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import { decomposePattern } from "@/core2/devices/seq/expr/types";
import { countBeats } from "@/core2/devices/seq/expr/count-beats";
import { collectBeatEvents } from "@/core2/devices/seq/cursor/collect-events";
import { createTraversalState } from "@/core2/devices/seq/expr/generic-traverse";

function freqToNote(freq: number): string {
	const notes = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
	const a4 = 440;
	const semitones = Math.round(12 * Math.log2(freq / a4));
	const noteIndex = ((semitones % 12) + 12 + 9) % 12;
	const octave = Math.floor((semitones + 9) / 12) + 4;
	return `${notes[noteIndex]}${octave}`;
}

// CLI
const args = process.argv.slice(2);
const pattern = args.find((a) => !a.startsWith("--")) || "c4 e4 g4";
const cycles = args.includes("--cycles")
	? parseInt(args[args.indexOf("--cycles") + 1] || "2")
	: 2;
const subBeats = args.includes("--sub-beats");
const showFreq = args.includes("--freq");
const byVoice = args.includes("--by-voice");

try {
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);
	const monos = decomposePattern(expr, "isolate");

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${totalBeats}, Voices: ${monos.length}`);
	console.log("");

	const step = subBeats ? 0.5 : 1;

	// Create one state per voice to track alt positions across cycles
	const voiceStates = monos.map(() => createTraversalState());

	for (let cycle = 0; cycle < cycles; cycle++) {
		console.log(`=== Cycle ${cycle} ===`);
		for (let beat = 0; beat < totalBeats; beat += step) {
			if (byVoice) {
				// Show each voice separately
				const voiceNotes: string[] = [];
				for (let v = 0; v < monos.length; v++) {
					const voiceEvents = collectBeatEvents(monos[v]!, beat, voiceStates[v]!, cycle);
					const notes = voiceEvents
						.filter((e) => e.freq)
						.map((e) => {
							const note = freqToNote(e.freq!);
							return showFreq ? `${note}(${Math.round(e.freq!)})` : note;
						});
					voiceNotes.push(notes.length > 0 ? notes.join("+") : "~");
				}
				console.log(`  Beat ${beat}: [${voiceNotes.join(" | ")}]`);
			} else {
				// Flatten all voices
				const events: string[] = [];
				for (let v = 0; v < monos.length; v++) {
					const voiceEvents = collectBeatEvents(monos[v]!, beat, voiceStates[v]!, cycle);
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
		}
		console.log("");
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
