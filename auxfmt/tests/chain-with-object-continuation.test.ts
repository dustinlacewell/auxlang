import { format } from "../src/format.js";

// Chain with multiline object - object starts inline after (
const input = `s.gate.adsr({ attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.4 }).scale(100, 4000)`;
const expected = `s.gate
  .adsr({
    attack: 0.01,
    decay: 0.4,
    sustain: 0.15,
    release: 0.4})
  .scale(100, 4000)`;

const actual = format(input);
if (actual === expected) {
	console.log("✓ chain with object then continuation");
} else {
	console.log("✗ chain with object then continuation");
	console.log("Expected:");
	console.log(expected.split("\n").map((l) => `  ${l}`).join("\n"));
	console.log("Got:");
	console.log(actual.split("\n").map((l) => `  ${l}`).join("\n"));
	process.exit(1);
}
