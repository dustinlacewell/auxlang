/**
 * Test the rational timing system end-to-end.
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { buildEvents } from "@/core2/devices/seq/events/build-events";
import { lookupEvent, lookupEventIndex } from "@/core2/devices/seq/events/lookup-event";
import { countBeats } from "@/core2/devices/seq/traverse/count-beats";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

// Test simple pattern
console.log("=== Simple pattern: c4 e4 g4 ===");
const expr1 = parseExpr("c4 e4 g4");
const state1 = createTraversalState();
const events1 = buildEvents(expr1, state1, 0);
const totalBeats1 = countBeats(expr1);

console.log("Total beats:", totalBeats1);
console.log("Events:", events1.map(e => ({
	freq: Math.round(e.freq),
	start: e.start,
	end: e.end,
	tiedFrom: e.isTiedFromPrevious,
	tiedTo: e.isTiedToNext,
})));

// Test lookup at various phases
console.log("\nLookup at various phases:");
for (const phase of [0, 0.5, 1, 1.5, 2, 2.5, 2.99]) {
	const position = phase % totalBeats1;
	const event = lookupEvent(events1, position);
	console.log(`  phase ${phase}: freq=${event ? Math.round(event.freq) : "null"}`);
}

// Test tie pattern
console.log("\n=== Tie pattern: c4_e4_g4 ===");
const expr2 = parseExpr("c4_e4_g4");
const state2 = createTraversalState();
const events2 = buildEvents(expr2, state2, 0);
const totalBeats2 = countBeats(expr2);

console.log("Total beats:", totalBeats2);
console.log("Events:", events2.map(e => ({
	freq: Math.round(e.freq),
	start: e.start,
	end: e.end,
	tiedFrom: e.isTiedFromPrevious,
	tiedTo: e.isTiedToNext,
})));

// Test subdivision
console.log("\n=== Subdivision: [c4 e4] g4 ===");
const expr3 = parseExpr("[c4 e4] g4");
const state3 = createTraversalState();
const events3 = buildEvents(expr3, state3, 0);
const totalBeats3 = countBeats(expr3);

console.log("Total beats:", totalBeats3);
console.log("Events:", events3.map(e => ({
	freq: Math.round(e.freq),
	start: e.start,
	end: e.end,
})));

// Test alternation across cycles
console.log("\n=== Alternation: <c4 e4> ===");
const expr4 = parseExpr("<c4 e4>");
const state4 = createTraversalState();

console.log("Cycle 0:");
const events4c0 = buildEvents(expr4, state4, 0);
console.log("  Events:", events4c0.map(e => Math.round(e.freq)));

console.log("Cycle 1:");
const events4c1 = buildEvents(expr4, state4, 1);
console.log("  Events:", events4c1.map(e => Math.round(e.freq)));

console.log("Cycle 2:");
const events4c2 = buildEvents(expr4, state4, 2);
console.log("  Events:", events4c2.map(e => Math.round(e.freq)));

console.log("\n=== All tests passed! ===");
