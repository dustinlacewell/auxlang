import { format } from "../src/format.js";

const input = `clock(90).seq("c3 ~ e3 ~").apply(s => s.saw().lpf(s.gate.adsr({ attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.4 }).scale(100, 4000)).gain(s.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.5 })).out())`;

const expected = `clock(90)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.saw()
      .lpf(
        s.gate
          .adsr({
            attack: 0.01,
            decay: 0.4,
            sustain: 0.15,
            release: 0.4})
          .scale(100, 4000))
      .gain(
        s.gate
          .adsr({
            attack: 0.01,
            decay: 0.2,
            sustain: 0.6,
            release: 0.5}))
      .out())`;

const actual = format(input);
if (actual === expected) {
	console.log("✓ apply with object configs");
} else {
	console.log("✗ apply with object configs");
	console.log("Expected:");
	console.log(expected.split("\n").map((l) => `  ${l}`).join("\n"));
	console.log("Got:");
	console.log(actual.split("\n").map((l) => `  ${l}`).join("\n"));
	process.exit(1);
}
