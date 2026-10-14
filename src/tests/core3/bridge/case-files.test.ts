/**
 * Every example/case .js file under src/tests/patterns/cases and
 * src/tests/interactive/cases (the raw patch sources backing the pattern- and
 * interactive-test UIs) must compile through the real core3 eval path, same as
 * the site/module-docs examples. Nothing else runs these files today.
 *
 * Skip reasons (none of these are fixed here — see SKIP below for which file
 * hits which):
 * - SEQ_CHAIN (207): chained .seq(pattern) — seq's module spec only has a clk
 *   positional slot; the pattern string must go through the free seq()
 *   function, not a chained call (src/core3/patch/seq.ts vs the chain
 *   dispatch in src/core3/patch/handle.ts).
 * - FILTER_RESONANCE (13): filter resonance param is named res, not resonance.
 * - LFO_MULT (4): lfo has no mult input in current API.
 * - COUNTER_UNDEF (4): counter() helper does not exist in current scope.
 * - MULT_CHAIN (3): chained .mult(...) — mult is not a registered
 *   module/alias in current API (use mul/gain/vca).
 * - CHORD_SPREAD (3): chord(...).spread() — spread is not a chainable method
 *   in current API.
 * - POLY_UNDEF (3): poly() helper does not exist in current scope.
 * - SIN_SUM (3): sin has no sum output in current API.
 * - GAIN_LEVEL (2): gain param is named by, not level.
 * - MIX_AB (2): mix takes an array input, not named a/b params.
 * - MULT_UNDEF (1): mult() helper does not exist in current scope.
 * - CLOCK_SWING (1): clock has no swing input/config in current API.
 * - QUANTIZE_SCALE (1): quantize config key is named scaleName, not scale.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { parseTestCase } from "../../interactive/parser";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const CASE_ROOTS = [
	join(__dirname, "../../patterns/cases"),
	join(__dirname, "../../interactive/cases"),
];

const SEQ_CHAIN =
	"chained .seq(pattern) — seq's module spec only has a clk positional slot; the pattern string must go through the free seq() function, not a chained call";
const FILTER_RESONANCE = "filter resonance param is named res, not resonance";
const LFO_MULT = "lfo has no mult input in current API";
const COUNTER_UNDEF = "counter() helper does not exist in current scope";
const MULT_CHAIN =
	"chained .mult(...) — mult is not a registered module/alias in current API (use mul/gain/vca)";
const CHORD_SPREAD = "chord(...).spread() — spread is not a chainable method in current API";
const POLY_UNDEF = "poly() helper does not exist in current scope";
const SIN_SUM = "sin has no sum output in current API";
const GAIN_LEVEL = "gain param is named by, not level";
const MIX_AB = "mix takes an array input, not named a/b params";
const MULT_UNDEF = "mult() helper does not exist in current scope";
const CLOCK_SWING = "clock has no swing input/config in current API";
const QUANTIZE_SCALE = "quantize config key is named scaleName, not scale";

/** Known-broken case files (fail today against the current core3 API; not fixed here). */
const SKIP: Record<string, string> = {
	"interactive/cases/drums/clap/clap-all-params.js": SEQ_CHAIN,
	"interactive/cases/drums/clap/clap-default.js": SEQ_CHAIN,
	"interactive/cases/drums/clap/clap-mod-decay.js": SEQ_CHAIN,
	"interactive/cases/drums/clap/clap-mod-tone.js": SEQ_CHAIN,
	"interactive/cases/drums/clap/clap-showcase.js": SEQ_CHAIN,
	"interactive/cases/drums/hihat/hihat-all-params.js": SEQ_CHAIN,
	"interactive/cases/drums/hihat/hihat-default.js": SEQ_CHAIN,
	"interactive/cases/drums/hihat/hihat-mod-decay.js": SEQ_CHAIN,
	"interactive/cases/drums/hihat/hihat-mod-metal.js": SEQ_CHAIN,
	"interactive/cases/drums/hihat/hihat-mod-tone.js": SEQ_CHAIN,
	"interactive/cases/drums/hihat/hihat-showcase.js": SEQ_CHAIN,
	"interactive/cases/drums/kick/kick-all-params.js": SEQ_CHAIN,
	"interactive/cases/drums/kick/kick-default.js": SEQ_CHAIN,
	"interactive/cases/drums/kick/kick-mod-click.js": SEQ_CHAIN,
	"interactive/cases/drums/kick/kick-mod-decay.js": SEQ_CHAIN,
	"interactive/cases/drums/kick/kick-mod-pitch.js": SEQ_CHAIN,
	"interactive/cases/drums/kick/kick-mod-sweep.js": SEQ_CHAIN,
	"interactive/cases/drums/kick/kick-showcase.js": SEQ_CHAIN,
	"interactive/cases/drums/snare/snare-all-params.js": SEQ_CHAIN,
	"interactive/cases/drums/snare/snare-default.js": SEQ_CHAIN,
	"interactive/cases/drums/snare/snare-mod-decay.js": SEQ_CHAIN,
	"interactive/cases/drums/snare/snare-mod-pitch.js": SEQ_CHAIN,
	"interactive/cases/drums/snare/snare-mod-snappy.js": SEQ_CHAIN,
	"interactive/cases/drums/snare/snare-mod-tone.js": SEQ_CHAIN,
	"interactive/cases/drums/snare/snare-showcase.js": SEQ_CHAIN,
	"interactive/cases/effects/delay/delay-all-params.js": SEQ_CHAIN,
	"interactive/cases/effects/delay/delay-default.js": SEQ_CHAIN,
	"interactive/cases/effects/delay/delay-mod-feedback.js": SEQ_CHAIN,
	"interactive/cases/effects/delay/delay-mod-mix.js": SEQ_CHAIN,
	"interactive/cases/effects/delay/delay-mod-time.js": SEQ_CHAIN,
	"interactive/cases/effects/delay/delay-mod-tone.js": SEQ_CHAIN,
	"interactive/cases/effects/delay/delay-showcase.js": SEQ_CHAIN,
	"interactive/cases/effects/native-reverb/native-reverb-all-params.js": SEQ_CHAIN,
	"interactive/cases/effects/native-reverb/native-reverb-default.js": SEQ_CHAIN,
	"interactive/cases/effects/native-reverb/native-reverb-mod-damp.js": SEQ_CHAIN,
	"interactive/cases/effects/native-reverb/native-reverb-mod-dry.js": SEQ_CHAIN,
	"interactive/cases/effects/native-reverb/native-reverb-mod-room.js": SEQ_CHAIN,
	"interactive/cases/effects/native-reverb/native-reverb-mod-wet.js": SEQ_CHAIN,
	"interactive/cases/effects/native-reverb/native-reverb-showcase.js": SEQ_CHAIN,
	"interactive/cases/effects/reverb/reverb-all-params.js": SEQ_CHAIN,
	"interactive/cases/effects/reverb/reverb-default.js": SEQ_CHAIN,
	"interactive/cases/effects/reverb/reverb-mod-damp.js": SEQ_CHAIN,
	"interactive/cases/effects/reverb/reverb-mod-mix.js": SEQ_CHAIN,
	"interactive/cases/effects/reverb/reverb-mod-room.js": SEQ_CHAIN,
	"interactive/cases/effects/reverb/reverb-showcase.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-all-params.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-default.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-age.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-feedback.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-flutter.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-mix.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-saturation.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-time.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-tone.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-mod-wow.js": SEQ_CHAIN,
	"interactive/cases/effects/tape/tape-showcase.js": SEQ_CHAIN,
	"interactive/cases/filters/bpf/bpf-all-params.js": FILTER_RESONANCE,
	"interactive/cases/filters/bpf/bpf-mod-cutoff.js": FILTER_RESONANCE,
	"interactive/cases/filters/bpf/bpf-mod-resonance.js": FILTER_RESONANCE,
	"interactive/cases/filters/bpf/bpf-showcase.js": FILTER_RESONANCE,
	"interactive/cases/filters/hpf/hpf-all-params.js": FILTER_RESONANCE,
	"interactive/cases/filters/hpf/hpf-mod-resonance.js": FILTER_RESONANCE,
	"interactive/cases/filters/hpf/hpf-showcase.js": SEQ_CHAIN,
	"interactive/cases/filters/lpf/lpf-all-params.js": FILTER_RESONANCE,
	"interactive/cases/filters/lpf/lpf-mod-resonance.js": FILTER_RESONANCE,
	"interactive/cases/filters/lpf/lpf-showcase.js": SEQ_CHAIN,
	"interactive/cases/filters/notch/notch-all-params.js": FILTER_RESONANCE,
	"interactive/cases/filters/notch/notch-mod-cutoff.js": FILTER_RESONANCE,
	"interactive/cases/filters/notch/notch-mod-resonance.js": FILTER_RESONANCE,
	"interactive/cases/filters/notch/notch-showcase.js": FILTER_RESONANCE,
	"interactive/cases/math/add/add-mod-to.js": LFO_MULT,
	"interactive/cases/math/add/add-showcase.js": SEQ_CHAIN,
	"interactive/cases/math/clip/clip-all-params.js": MULT_CHAIN,
	"interactive/cases/math/clip/clip-default.js": MULT_CHAIN,
	"interactive/cases/math/clip/clip-mod-max.js": LFO_MULT,
	"interactive/cases/math/clip/clip-mod-min.js": LFO_MULT,
	"interactive/cases/math/clip/clip-showcase.js": SEQ_CHAIN,
	"interactive/cases/math/mult/mult-all-params.js": MULT_CHAIN,
	"interactive/cases/math/mult/mult-default.js": MULT_UNDEF,
	"interactive/cases/math/mult/mult-mod-by.js": LFO_MULT,
	"interactive/cases/math/mult/mult-showcase.js": SEQ_CHAIN,
	"interactive/cases/modulators/ad/ad-all-params.js": SEQ_CHAIN,
	"interactive/cases/modulators/ad/ad-default.js": SEQ_CHAIN,
	"interactive/cases/modulators/ad/ad-mod-attack.js": SEQ_CHAIN,
	"interactive/cases/modulators/ad/ad-mod-decay.js": SEQ_CHAIN,
	"interactive/cases/modulators/ad/ad-showcase.js": SEQ_CHAIN,
	"interactive/cases/modulators/adsr/adsr-all-params.js": SEQ_CHAIN,
	"interactive/cases/modulators/adsr/adsr-default.js": SEQ_CHAIN,
	"interactive/cases/modulators/adsr/adsr-mod-attack.js": SEQ_CHAIN,
	"interactive/cases/modulators/adsr/adsr-mod-decay.js": SEQ_CHAIN,
	"interactive/cases/modulators/adsr/adsr-mod-release.js": SEQ_CHAIN,
	"interactive/cases/modulators/adsr/adsr-mod-sustain.js": SEQ_CHAIN,
	"interactive/cases/modulators/adsr/adsr-showcase.js": SEQ_CHAIN,
	"interactive/cases/modulators/ar/ar-all-params.js": SEQ_CHAIN,
	"interactive/cases/modulators/ar/ar-default.js": SEQ_CHAIN,
	"interactive/cases/modulators/ar/ar-mod-attack.js": SEQ_CHAIN,
	"interactive/cases/modulators/ar/ar-mod-release.js": SEQ_CHAIN,
	"interactive/cases/modulators/ar/ar-showcase.js": SEQ_CHAIN,
	"interactive/cases/oscillators/lfo/lfo-showcase.js": FILTER_RESONANCE,
	"interactive/cases/oscillators/noise/noise-showcase.js": SEQ_CHAIN,
	"interactive/cases/oscillators/saw/saw-showcase.js": SEQ_CHAIN,
	"interactive/cases/oscillators/sin/sin-showcase.js": SEQ_CHAIN,
	"interactive/cases/oscillators/sqr/sqr-showcase.js": SEQ_CHAIN,
	"interactive/cases/oscillators/tri/tri-showcase.js": SEQ_CHAIN,
	"interactive/cases/poly/poly/poly-all-params.js": POLY_UNDEF,
	"interactive/cases/poly/poly/poly-mod-input.js": POLY_UNDEF,
	"interactive/cases/poly/poly/poly-showcase.js": POLY_UNDEF,
	"interactive/cases/poly/sum/sum-all-params.js": SIN_SUM,
	"interactive/cases/poly/sum/sum-default.js": SIN_SUM,
	"interactive/cases/poly/sum/sum-mod-input.js": SIN_SUM,
	"interactive/cases/poly/sum/sum-showcase.js": SEQ_CHAIN,
	"interactive/cases/poly/voices/voices-default.js": SEQ_CHAIN,
	"interactive/cases/poly/voices/voices-per-voice-filter.js": SEQ_CHAIN,
	"interactive/cases/poly/voices/voices-showcase.js": SEQ_CHAIN,
	"interactive/cases/poly/voices/voices-trigger-seq.js": SEQ_CHAIN,
	"interactive/cases/stereo/pan/pan-all-params.js": SEQ_CHAIN,
	"interactive/cases/stereo/pan/pan-default.js": SEQ_CHAIN,
	"interactive/cases/stereo/pan/pan-mod-pan.js": SEQ_CHAIN,
	"interactive/cases/stereo/pan/pan-showcase.js": SEQ_CHAIN,
	"interactive/cases/stereo/spread/spread-all-params.js": SEQ_CHAIN,
	"interactive/cases/stereo/spread/spread-default.js": SEQ_CHAIN,
	"interactive/cases/stereo/spread/spread-mod-width.js": SEQ_CHAIN,
	"interactive/cases/stereo/spread/spread-showcase.js": SEQ_CHAIN,
	"interactive/cases/timing/clock/clock-all-params.js": SEQ_CHAIN,
	"interactive/cases/timing/clock/clock-default.js": SEQ_CHAIN,
	"interactive/cases/timing/clock/clock-mod-bpm.js": SEQ_CHAIN,
	"interactive/cases/timing/clock/clock-mod-swing.js": SEQ_CHAIN,
	"interactive/cases/timing/clock/clock-showcase.js": SEQ_CHAIN,
	"interactive/cases/timing/clockdiv/clockdiv-all-params.js": SEQ_CHAIN,
	"interactive/cases/timing/clockdiv/clockdiv-default.js": SEQ_CHAIN,
	"interactive/cases/timing/clockdiv/clockdiv-mod-by.js": SEQ_CHAIN,
	"interactive/cases/timing/clockdiv/clockdiv-showcase.js": SEQ_CHAIN,
	"interactive/cases/timing/clockmult/clockmult-all-params.js": SEQ_CHAIN,
	"interactive/cases/timing/clockmult/clockmult-default.js": SEQ_CHAIN,
	"interactive/cases/timing/clockmult/clockmult-mod-by.js": SEQ_CHAIN,
	"interactive/cases/timing/clockmult/clockmult-showcase.js": SEQ_CHAIN,
	"interactive/cases/timing/counter/counter-all-params.js": COUNTER_UNDEF,
	"interactive/cases/timing/counter/counter-default.js": COUNTER_UNDEF,
	"interactive/cases/timing/counter/counter-mod-max.js": COUNTER_UNDEF,
	"interactive/cases/timing/counter/counter-showcase.js": COUNTER_UNDEF,
	"interactive/cases/timing/seq/seq-alternate.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-default.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-elongate.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-euclidean.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-groups.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-multiply.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-poly.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-replicate.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-rests.js": SEQ_CHAIN,
	"interactive/cases/timing/seq/seq-showcase.js": SEQ_CHAIN,
	"interactive/cases/timing/swing/swing-all-params.js": SEQ_CHAIN,
	"interactive/cases/timing/swing/swing-default.js": SEQ_CHAIN,
	"interactive/cases/timing/swing/swing-mod-amount.js": SEQ_CHAIN,
	"interactive/cases/timing/swing/swing-showcase.js": CLOCK_SWING,
	"interactive/cases/utilities/chord/chord-all-params.js": CHORD_SPREAD,
	"interactive/cases/utilities/chord/chord-default.js": CHORD_SPREAD,
	"interactive/cases/utilities/chord/chord-mod-root.js": CHORD_SPREAD,
	"interactive/cases/utilities/chord/chord-showcase.js": SEQ_CHAIN,
	"interactive/cases/utilities/gain/gain-all-params.js": GAIN_LEVEL,
	"interactive/cases/utilities/gain/gain-mod-level.js": GAIN_LEVEL,
	"interactive/cases/utilities/gain/gain-showcase.js": SEQ_CHAIN,
	"interactive/cases/utilities/mix/mix-all-params.js": MIX_AB,
	"interactive/cases/utilities/mix/mix-default.js": MIX_AB,
	"interactive/cases/utilities/mix/mix-mod-a.js": SEQ_CHAIN,
	"interactive/cases/utilities/mix/mix-showcase.js": SEQ_CHAIN,
	"interactive/cases/utilities/pick/pick-showcase.js": SEQ_CHAIN,
	"interactive/cases/utilities/quantize/quantize-all-params.js": QUANTIZE_SCALE,
	"interactive/cases/utilities/quantize/quantize-mod-input.js": SEQ_CHAIN,
	"interactive/cases/utilities/quantize/quantize-showcase.js": SEQ_CHAIN,
	"interactive/cases/utilities/sah/sah-all-params.js": SEQ_CHAIN,
	"interactive/cases/utilities/sah/sah-default.js": SEQ_CHAIN,
	"interactive/cases/utilities/sah/sah-mod-input.js": SEQ_CHAIN,
	"interactive/cases/utilities/sah/sah-showcase.js": SEQ_CHAIN,
	"interactive/cases/utilities/slew/slew-all-params.js": SEQ_CHAIN,
	"interactive/cases/utilities/slew/slew-default.js": SEQ_CHAIN,
	"interactive/cases/utilities/slew/slew-mod-fall.js": SEQ_CHAIN,
	"interactive/cases/utilities/slew/slew-mod-rise.js": SEQ_CHAIN,
	"interactive/cases/utilities/slew/slew-showcase.js": SEQ_CHAIN,
	"patterns/cases/basics/note-flats.js": SEQ_CHAIN,
	"patterns/cases/basics/note-octaves.js": SEQ_CHAIN,
	"patterns/cases/basics/note-sequence.js": SEQ_CHAIN,
	"patterns/cases/basics/note-sharps.js": SEQ_CHAIN,
	"patterns/cases/basics/note-single.js": SEQ_CHAIN,
	"patterns/cases/basics/rest-basic.js": SEQ_CHAIN,
	"patterns/cases/basics/rest-multiple.js": SEQ_CHAIN,
	"patterns/cases/basics/showcase.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-basic.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-dense.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-five-eight.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-four-eight.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-on-group.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-on-stack.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-sequence.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-seven-sixteen.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-sparse.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-with-alternate.js": SEQ_CHAIN,
	"patterns/cases/euclidean/euclidean-with-maybe.js": SEQ_CHAIN,
	"patterns/cases/euclidean/showcase.js": SEQ_CHAIN,
	"patterns/cases/groups/alternate-basic.js": SEQ_CHAIN,
	"patterns/cases/groups/alternate-in-sequence.js": SEQ_CHAIN,
	"patterns/cases/groups/alternate-three.js": SEQ_CHAIN,
	"patterns/cases/groups/alternate-with-rest.js": SEQ_CHAIN,
	"patterns/cases/groups/group-basic.js": SEQ_CHAIN,
	"patterns/cases/groups/group-mixed.js": SEQ_CHAIN,
	"patterns/cases/groups/group-nested.js": SEQ_CHAIN,
	"patterns/cases/groups/group-triplet.js": SEQ_CHAIN,
	"patterns/cases/groups/group-with-alternate.js": SEQ_CHAIN,
	"patterns/cases/groups/group-with-multiply.js": SEQ_CHAIN,
	"patterns/cases/groups/group-with-rest.js": SEQ_CHAIN,
	"patterns/cases/groups/showcase.js": SEQ_CHAIN,
	"patterns/cases/modifiers/elongate-basic.js": SEQ_CHAIN,
	"patterns/cases/modifiers/elongate-mixed.js": SEQ_CHAIN,
	"patterns/cases/modifiers/elongate-with-rest.js": SEQ_CHAIN,
	"patterns/cases/modifiers/multiply-basic.js": SEQ_CHAIN,
	"patterns/cases/modifiers/multiply-mixed.js": SEQ_CHAIN,
	"patterns/cases/modifiers/multiply-vs-replicate.js": SEQ_CHAIN,
	"patterns/cases/modifiers/multiply-with-rest.js": SEQ_CHAIN,
	"patterns/cases/modifiers/replicate-basic.js": SEQ_CHAIN,
	"patterns/cases/modifiers/replicate-mixed.js": SEQ_CHAIN,
	"patterns/cases/modifiers/replicate-with-rest.js": SEQ_CHAIN,
	"patterns/cases/modifiers/showcase.js": SEQ_CHAIN,
	"patterns/cases/polyphony/showcase.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-basic.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-four.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-mixed-single.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-sequence.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-two.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-with-alternate.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-with-elongate.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-with-group.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-with-maybe.js": SEQ_CHAIN,
	"patterns/cases/polyphony/stack-with-rest.js": SEQ_CHAIN,
	"patterns/cases/probability/maybe-basic.js": SEQ_CHAIN,
	"patterns/cases/probability/maybe-high.js": SEQ_CHAIN,
	"patterns/cases/probability/maybe-low.js": SEQ_CHAIN,
	"patterns/cases/probability/maybe-mixed.js": SEQ_CHAIN,
	"patterns/cases/probability/maybe-with-alternate.js": SEQ_CHAIN,
	"patterns/cases/probability/maybe-with-group.js": SEQ_CHAIN,
	"patterns/cases/probability/maybe-with-multiply.js": SEQ_CHAIN,
	"patterns/cases/probability/showcase.js": SEQ_CHAIN,
	"patterns/cases/tie/showcase.js": SEQ_CHAIN,
	"patterns/cases/tie/tie-basic.js": SEQ_CHAIN,
	"patterns/cases/tie/tie-three.js": SEQ_CHAIN,
	"patterns/cases/tie/tie-vs-sequence.js": SEQ_CHAIN,
	"patterns/cases/tie/tie-with-alternate.js": SEQ_CHAIN,
	"patterns/cases/tie/tie-with-group.js": SEQ_CHAIN,
	"patterns/cases/tie/tie-with-rest.js": SEQ_CHAIN,
};

function findJsFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...findJsFiles(full));
		} else if (entry.endsWith(".js")) {
			out.push(full);
		}
	}
	return out;
}

describe("case files compile", () => {
	for (const root of CASE_ROOTS) {
		const files = findJsFiles(root);
		for (const file of files) {
			const label = relative(join(__dirname, "../.."), file).replace(/\\/g, "/");
			const reason = SKIP[label];
			const runner = reason ? it.skip : it;
			runner(`${label}${reason ? ` (skipped: ${reason})` : ""}`, () => {
				const content = readFileSync(file, "utf-8");
				const { code } = parseTestCase(content);
				expect(() => evalPatch(code)).not.toThrow();
			});
		}
	}
});
