/**
 * Compare Strudel output with our system's output
 */

// Strudel's actual output (start, end, value)
const strudelEvents = [
	{ start: 0.0000, end: 0.2500, value: 2 },   // F (scale degree 2 in D minor)
	{ start: 0.5000, end: 0.7500, value: 2 },   // F
	{ start: 1.0000, end: 1.5000, value: 2 },   // F
	{ start: 1.5000, end: 2.0000, value: 3 },   // G
	{ start: 2.0000, end: 2.2500, value: -1 },  // C
	{ start: 2.5000, end: 3.0000, value: -1 },  // C
	{ start: 3.0000, end: 3.5000, value: -1 },  // C
	{ start: 3.5000, end: 3.7500, value: 0 },   // D
	{ start: 4.0000, end: 4.5000, value: 0 },   // D
	{ start: 4.5000, end: 5.0000, value: 0 },   // D
	{ start: 5.0000, end: 5.2500, value: 0 },   // D
	{ start: 5.5000, end: 6.0000, value: 0 },   // D
	{ start: 6.0000, end: 6.5000, value: 0 },   // D
	{ start: 6.5000, end: 6.7500, value: 0 },   // D
	{ start: 7.0000, end: 7.5000, value: 0 },   // D
	{ start: 7.5000, end: 8.0000, value: 0 },   // D
];

console.log("=== STRUDEL ANALYSIS ===");
console.log(`Total events: ${strudelEvents.length}`);
console.log(`Pattern length: ${strudelEvents[strudelEvents.length - 1]!.end} beats`);

// Analyze the timing structure
console.log("\n--- Event positions ---");
const positions = strudelEvents.map(e => e.start);
console.log("Start positions:", positions.join(", "));

console.log("\n--- Gaps between events ---");
for (let i = 1; i < strudelEvents.length; i++) {
	const gap = strudelEvents[i]!.start - strudelEvents[i - 1]!.start;
	console.log(`Event ${i - 1} -> ${i}: gap = ${gap.toFixed(4)}`);
}

console.log("\n--- Event durations ---");
for (const e of strudelEvents) {
	const dur = e.end - e.start;
	console.log(`${e.start.toFixed(4)}: duration = ${dur.toFixed(4)}, value = ${e.value}`);
}

// Map scale degrees to notes (D minor: D E F G A Bb C)
const scaleMap: Record<number, string> = {
	"-1": "C",
	"0": "D",
	"1": "E",
	"2": "F",
	"3": "G",
};

console.log("\n--- Notes sequence ---");
const notes = strudelEvents.map(e => scaleMap[e.value] ?? "?");
console.log(notes.join(" "));

// Identify the rhythm pattern
console.log("\n--- Rhythm analysis ---");
console.log("First 4 events (beats 0-2):");
for (let i = 0; i < 4; i++) {
	const e = strudelEvents[i]!;
	console.log(`  ${e.start} - ${e.end} (dur: ${(e.end - e.start).toFixed(4)}) = ${scaleMap[e.value]}`);
}

console.log("\nNext 12 events (beats 2-8):");
for (let i = 4; i < 16; i++) {
	const e = strudelEvents[i]!;
	console.log(`  ${e.start} - ${e.end} (dur: ${(e.end - e.start).toFixed(4)}) = ${scaleMap[e.value]}`);
}

// Key insight: what's the subdivision?
console.log("\n=== KEY INSIGHTS ===");
const uniqueStarts = [...new Set(positions.map(p => p % 1))];
console.log("Unique fractional positions:", uniqueStarts.sort((a, b) => a - b));

const uniqueDurations = [...new Set(strudelEvents.map(e => e.end - e.start))];
console.log("Unique durations:", uniqueDurations.sort((a, b) => a - b));
