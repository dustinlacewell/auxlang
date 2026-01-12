/**
 * Interactive test data aggregator.
 *
 * Collects all device tests from individual files.
 */

import type { TestDefinition } from "./types";

// Oscillators
import { sawTests } from "./oscillators/saw";
import { sinTests } from "./oscillators/sin";
import { sqrTests } from "./oscillators/sqr";
import { triTests } from "./oscillators/tri";
import { noiseTests } from "./oscillators/noise";
import { lfoTests } from "./oscillators/lfo";

// Filters
import { lpfTests } from "./filters/lpf";
import { hpfTests } from "./filters/hpf";
import { bpfTests } from "./filters/bpf";
import { notchTests } from "./filters/notch";

// Drums
import { kickTests } from "./drums/kick";
import { snareTests } from "./drums/snare";
import { hihatTests } from "./drums/hihat";
import { clapTests } from "./drums/clap";

// Modulators
import { adsrTests } from "./modulators/adsr";
import { envTests } from "./modulators/env";

// Effects
import { delayTests } from "./effects/delay";
import { reverbTests } from "./effects/reverb";
import { tapeTests } from "./effects/tape";

// Utilities
import { gainTests } from "./utilities/gain";
import { mixTests } from "./utilities/mix";
import { slewTests } from "./utilities/slew";
import { sahTests } from "./utilities/sah";
import { quantizeTests } from "./utilities/quantize";
import { spreadTests } from "./utilities/spread";
import { chordTests } from "./utilities/chord";

// Timing
import { clockTests } from "./timing/clock";
import { seqTests } from "./timing/seq";
import { clockDivTests } from "./timing/clock-div";
import { clockMultTests } from "./timing/clock-mult";
import { counterTests } from "./timing/counter";

// Math
import { scaleTests } from "./math/scale";
import { addTests } from "./math/add";
import { multTests } from "./math/mult";
import { clipTests } from "./math/clip";

export { TestDefinition };

export const tests: TestDefinition[] = [
	// Oscillators
	...sawTests,
	...sinTests,
	...sqrTests,
	...triTests,
	...noiseTests,
	...lfoTests,

	// Filters
	...lpfTests,
	...hpfTests,
	...bpfTests,
	...notchTests,

	// Drums
	...kickTests,
	...snareTests,
	...hihatTests,
	...clapTests,

	// Modulators
	...adsrTests,
	...envTests,

	// Effects
	...delayTests,
	...reverbTests,
	...tapeTests,

	// Utilities
	...gainTests,
	...mixTests,
	...slewTests,
	...sahTests,
	...quantizeTests,
	...spreadTests,
	...chordTests,

	// Timing
	...clockTests,
	...seqTests,
	...clockDivTests,
	...clockMultTests,
	...counterTests,

	// Math
	...scaleTests,
	...addTests,
	...multTests,
	...clipTests,
];

export function getTestsByCategory(): Map<string, TestDefinition[]> {
	const byCategory = new Map<string, TestDefinition[]>();
	for (const test of tests) {
		const existing = byCategory.get(test.category);
		if (existing) {
			existing.push(test);
		} else {
			byCategory.set(test.category, [test]);
		}
	}
	return byCategory;
}
