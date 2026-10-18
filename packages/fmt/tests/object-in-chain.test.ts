import { format } from "../src/format.js";

// Single method chain with multiline object - { stays on same line
const input = `s.adsr({ attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.4 })`;
const expected = `s
  .adsr({
    attack: 0.01,
    decay: 0.4,
    sustain: 0.15,
    release: 0.4})`;

const actual = format(input);
if (actual === expected) {
	console.log("✓ object in chain method");
} else {
	console.log("✗ object in chain method");
	console.log("Expected:");
	console.log(expected.split("\n").map((l) => `  ${l}`).join("\n"));
	console.log("Got:");
	console.log(actual.split("\n").map((l) => `  ${l}`).join("\n"));
	process.exit(1);
}
