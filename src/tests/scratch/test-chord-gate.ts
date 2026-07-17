/**
 * Debug chord gate issue
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { buildEvents } from "@/core2/devices/seq/events/build-events";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { countBeats } from "@/core2/devices/seq/traverse/count-beats";
import { voiceCount } from "@/core2/devices/seq/voices/count";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

const pattern = "{c4,e4,g4} e4 {d4,f4,a4} f4";
const expr = parseExpr(pattern);

console.log("=== Pattern:", pattern, "===");
console.log("Total beats:", countBeats(expr));
console.log("Voice count:", voiceCount(expr, "isolate"));

// Decompose into mono patterns
const monos = decomposePattern(expr, "isolate");
console.log("\n=== Decomposed into", monos.length, "voices ===");

for (let i = 0; i < monos.length; i++) {
	const mono = monos[i]!;
	const state = createTraversalState();
	const events = buildEvents(mono, state, 0);
	const totalBeats = countBeats(mono);

	console.log(`\nVoice ${i} (${mono.type}, ${totalBeats} beats):`);
	console.log("Events:", events.map(e => ({
		freq: Math.round(e.freq),
		start: e.start.toFixed(2),
		end: e.end.toFixed(2),
		rest: e.isRest,
		tiedTo: e.isTiedToNext,
	})));
}

// Now simulate gate behavior for voice 0
console.log("\n=== Gate simulation for voice 0 ===");
import { lookupEventIndex } from "@/core2/devices/seq/events/lookup-event";

// Voice 1 has c4 from the first chord
const state0 = createTraversalState();
const events0 = buildEvents(monos[1]!, state0, 0);
const totalBeats0 = countBeats(monos[1]!);

for (let phase = 0; phase < totalBeats0; phase += 0.1) {
	const position = phase % totalBeats0;

	// Using find (linear search)
	const eventFind = events0.find(e => position >= e.start && position < e.end);

	// Using lookupEventIndex (binary search)
	const idx = lookupEventIndex(events0, position);
	const eventBinary = idx >= 0 ? events0[idx] : null;

	let gate = 0;
	const event = eventBinary;
	if (event && !event.isRest) {
		const gapSize = 0.02;
		const noteLength = event.end - event.start;
		const gapStart = event.end - noteLength * gapSize;
		gate = event.isTiedToNext || position < gapStart ? 1 : 0;
	}

	const findFreq = eventFind ? Math.round(eventFind.freq) : "none";
	const binaryFreq = eventBinary ? Math.round(eventBinary.freq) : "none";

	if (findFreq !== binaryFreq) {
		console.log(`phase=${phase.toFixed(1)}: MISMATCH find=${findFreq} binary=${binaryFreq}`);
	} else {
		console.log(`phase=${phase.toFixed(1)}: freq=${binaryFreq}, gate=${gate}`);
	}
}
