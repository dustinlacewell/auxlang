/**
 * Debug sequencer gate output for "c4 ~ ~ ~"
 */

import { parseExpr } from "../../core2/devices/seq/expr/parse";
import { countBeats } from "../../core2/devices/seq/expr/traverse";
import {
	createMonoTraversalState,
	traverseMono,
	clearMonoProbDecisions,
} from "../../core2/devices/seq/mono-traverse";

const pattern = "c4 ~ ~ ~";
const expr = parseExpr(pattern);
const totalBeats = countBeats(expr);
const state = createMonoTraversalState();

console.log(`Pattern: "${pattern}"`);
console.log(`Total beats: ${totalBeats}`);
console.log("");

// Simulate 4 beats worth of samples
const samplesPerBeat = 100; // simplified
const totalSamples = totalBeats * samplesPerBeat;

console.log("Beat-by-beat gate values:");
for (let beat = 0; beat < totalBeats; beat++) {
	// Sample at start of beat
	const phaseStart = 0;
	const outputStart = traverseMono(expr, { beatIndex: beat, phase: phaseStart, cycle: 0, totalBeats }, state);

	// Sample at middle of beat
	const phaseMid = 0.5;
	const outputMid = traverseMono(expr, { beatIndex: beat, phase: phaseMid, cycle: 0, totalBeats }, state);

	// Sample near end of beat
	const phaseEnd = 0.99;
	const outputEnd = traverseMono(expr, { beatIndex: beat, phase: phaseEnd, cycle: 0, totalBeats }, state);

	console.log(`  Beat ${beat}: gate=[${outputStart.gate}, ${outputMid.gate}, ${outputEnd.gate}] (start, mid, end)`);
}
