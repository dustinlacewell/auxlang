import { format } from "../src/format.js";

const input = `saw(440).lpf(800).out()`;
const expected = `saw(440).lpf(800).out()`;

const actual = format(input);
if (actual === expected) {
	console.log("✓ simple chain stays inline");
} else {
	console.log("✗ simple chain stays inline");
	console.log("Expected:", expected);
	console.log("Got:", actual);
	process.exit(1);
}
