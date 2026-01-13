/**
 * Tests for auxfmt formatter.
 */

import { format } from "./format.js";

const tests: Array<{ name: string; input: string; expected: string }> = [
	{
		name: "simple chain",
		input: `saw(440).lpf(800).out()`,
		expected: `saw(440).lpf(800).out()`,
	},
	{
		name: "chain with apply",
		input: `clock(120).seq("c3 e3 g3").apply(s => s.saw().lpf(800).gain(s.gate.adsr()).out())`,
		expected: `clock(120)
  .seq("c3 e3 g3")
  .apply(s =>
    s.saw()
      .lpf(800)
      .gain(s.gate.adsr())
      .out())`,
	},
	{
		name: "long chain without apply",
		input: `clock(120).seq("c2 ~ g2 ~ e2 ~ g2 ~").saw().lpf(1000).gain(0.5).out()`,
		expected: `clock(120)
  .seq("c2 ~ g2 ~ e2 ~ g2 ~")
  .saw()
  .lpf(1000)
  .gain(0.5)
  .out()`,
	},
	{
		name: "object config short",
		input: `lpf({ cutoff: 800, resonance: 0.5 })`,
		expected: `lpf({ cutoff: 800, resonance: 0.5 })`,
	},
	{
		name: "nested apply with modulation",
		input: `clock(120).seq("c2 ~ g2 ~ e2 ~ g2 ~").apply(s => s.saw().lpf(s.gate.ad(0.01, 0.2).scale(200, 2500)).gain(s.gate.ad(0.005, 0.25)).out())`,
		expected: `clock(120)
  .seq("c2 ~ g2 ~ e2 ~ g2 ~")
  .apply(s =>
    s.saw()
      .lpf(s.gate.ad(0.01, 0.2).scale(200, 2500))
      .gain(s.gate.ad(0.005, 0.25))
      .out())`,
	},

	// Device normalization tests
	{
		name: "normalize setters to positional - root device",
		input: `saw().freq(440).out()`,
		expected: `saw(440).out()`,
	},
	{
		name: "normalize setters to positional - chained device",
		input: `saw(440).lpf().cutoff(800).resonance(0.5).out()`,
		expected: `saw(440).lpf(800, 0.5).out()`,
	},
	{
		name: "normalize config to positional",
		input: `saw({ freq: 440 }).out()`,
		expected: `saw(440).out()`,
	},
	{
		name: "normalize setters to config - delay",
		input: `saw(110).delay().time(0.2).feedback(0.5).mix(0.3).out()`,
		expected: `saw(110).delay({ time: 0.2, feedback: 0.5, mix: 0.3 }).out()`,
	},
	{
		name: "normalize positional to config - delay",
		input: `saw(110).delay(0.2, 0.5, 0.3).out()`,
		expected: `saw(110).delay({ time: 0.2, feedback: 0.5, mix: 0.3 }).out()`,
	},
	{
		name: "property access on its own line",
		input: `clock(120).seq("~ c4 ~ c4").trig.clap({ decay: 0.2, tone: 0.5 }).out()`,
		expected: `clock(120)
  .seq("~ c4 ~ c4")
  .trig
  .clap({ decay: 0.2, tone: 0.5 })
  .out()`,
	},
	{
		name: "preserve unknown methods",
		input: `foo().bar(1, 2).baz()`,
		expected: `foo().bar(1, 2).baz()`,
	},
];

let passed = 0;
let failed = 0;

for (const test of tests) {
	const result = format(test.input);
	if (result === test.expected) {
		console.log(`✓ ${test.name}`);
		passed++;
	} else {
		console.log(`✗ ${test.name}`);
		console.log("  Expected:");
		console.log(test.expected.split("\n").map((l) => `    ${l}`).join("\n"));
		console.log("  Got:");
		console.log(result.split("\n").map((l) => `    ${l}`).join("\n"));
		failed++;
	}
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
