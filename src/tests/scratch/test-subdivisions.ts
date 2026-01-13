/**
 * Test subdivision fix for {c3@4,[c4 e4 g4 e4]}
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import { collectBeatEvents } from "@/core2/devices/seq/cursor/collect-events";
import { decomposePattern } from "@/core2/devices/seq/expr/types";
import { countBeats } from "@/core2/devices/seq/expr/traverse";

const pattern = "{c3@4,[c4 e4 g4 e4]}";
const expr = parseExpr(pattern);

console.log("Pattern:", pattern);
console.log("Voice count:", 2);
console.log("");

const monoExprs = decomposePattern(expr);

for (let v = 0; v < monoExprs.length; v++) {
	const monoExpr = monoExprs[v]!;
	const totalBeats = countBeats(monoExpr);

	console.log(`=== Voice ${v} ===`);
	console.log(`Total beats: ${totalBeats}`);
	console.log("");

	for (let beat = 0; beat < totalBeats; beat++) {
		const events = collectBeatEvents(monoExpr, beat, {}, 0);
		console.log(`Beat ${beat}: ${events.length} events`);
		for (const e of events) {
			console.log(`  ${e.start.toFixed(3)}-${e.end.toFixed(3)}: ${e.freq.toFixed(1)} Hz`);
		}
	}
	console.log("");
}
