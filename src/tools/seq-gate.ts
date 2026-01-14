/**
 * Debug sequencer gate output - shows gate values at start/mid/end of each beat.
 *
 * Usage:
 *   npx tsx src/tools/seq-gate.ts "c4 ~ ~ ~"
 *   npx tsx src/tools/seq-gate.ts "c4 e4 g4" --cycles 2
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import { countBeats } from "@/core2/devices/seq/expr/count-beats";
import { collectBeatEvents } from "@/core2/devices/seq/cursor/collect-events";
import { createTraversalState } from "@/core2/devices/seq/expr/generic-traverse";

function getGateAtPhase(events: { start: number; end: number }[], phase: number): number {
	for (const e of events) {
		if (phase >= e.start && phase < e.end) {
			return 1;
		}
	}
	return 0;
}

// CLI
const args = process.argv.slice(2);
const pattern = args.find((a) => !a.startsWith("--")) || "c4 ~ ~ ~";
const cycles = args.includes("--cycles")
	? parseInt(args[args.indexOf("--cycles") + 1] || "1")
	: 1;

try {
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);
	const state = createTraversalState();

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${totalBeats}`);
	console.log("");

	for (let cycle = 0; cycle < cycles; cycle++) {
		if (cycles > 1) console.log(`=== Cycle ${cycle} ===`);

		console.log("Beat-by-beat gate values:");
		for (let beat = 0; beat < totalBeats; beat++) {
			const events = collectBeatEvents(expr, beat, state, cycle);

			const gateStart = getGateAtPhase(events, 0);
			const gateMid = getGateAtPhase(events, 0.5);
			const gateEnd = getGateAtPhase(events, 0.99);

			console.log(`  Beat ${beat}: gate=[${gateStart}, ${gateMid}, ${gateEnd}] (start, mid, end)`);
		}
		console.log("");
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
