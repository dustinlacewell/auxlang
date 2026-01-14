/**
 * Show highlighting positions at each beat in a sequencer pattern.
 * Useful for debugging the editor's pattern highlighting.
 *
 * Usage:
 *   npx tsx src/tools/seq-highlights.ts "c4 e4 g4"
 *   npx tsx src/tools/seq-highlights.ts "{c4, e4}" --cycles 4
 *   npx tsx src/tools/seq-highlights.ts "<c4 d4> e4" --positions
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import { countBeats } from "@/core2/devices/seq/expr/count-beats";
import { extractPositionsForBeat } from "@/core2/devices/seq/extract-beat-positions";
import { createTraversalState } from "@/core2/devices/seq/expr/generic-traverse";

// CLI
const args = process.argv.slice(2);
const pattern = args.find((a) => !a.startsWith("--")) || "c4 e4 g4";
const cycles = args.includes("--cycles")
	? parseInt(args[args.indexOf("--cycles") + 1] || "2")
	: 2;
const showPositions = args.includes("--positions");
const subBeats = args.includes("--sub-beats");

try {
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);

	console.log(`Pattern: "${pattern}"`);
	console.log(`Total beats: ${totalBeats}`);
	console.log("");

	const step = subBeats ? 0.5 : 1;
	const state = createTraversalState();

	for (let cycle = 0; cycle < cycles; cycle++) {
		console.log(`=== Cycle ${cycle} ===`);
		for (let beat = 0; beat < totalBeats; beat += step) {
			const positions = extractPositionsForBeat(expr, pattern, beat, cycle, state);
			const highlights = positions.map((p) => pattern.slice(p.start, p.end));

			if (highlights.length > 0) {
				if (showPositions) {
					const posInfo = positions
						.map((p) => `"${pattern.slice(p.start, p.end)}"[${p.start}:${p.end}]`)
						.join(", ");
					console.log(`  Beat ${beat}: ${posInfo}`);
				} else {
					console.log(`  Beat ${beat}: ${highlights.join(", ")}`);
				}
			} else {
				console.log(`  Beat ${beat}: (none)`);
			}
		}
		console.log("");
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
