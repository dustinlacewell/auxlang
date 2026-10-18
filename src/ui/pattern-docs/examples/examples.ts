/**
 * The whole content of the pattern-docs page, as DATA. Every entry is a real
 * core3 patch string that must compile through the eval path and render 2 s
 * non-silent, bounded, finite — the scratch script and the vitest test both
 * hold this file to that bar so the docs can never rot.
 *
 * House style (see .claude/rules/aux-style-guide.md): the pattern is the star,
 * so the synth voice stays a plain tri/sin gated by an adsr, and only the
 * pattern or combinator under discussion varies. Descriptions say what the
 * listener should EXPECT to hear.
 */

import type { DocExample } from "@/ui/docs-kit/doc-example";
import { SEQUENCE_EXAMPLES } from "@/ui/pattern-docs/examples/sequence";
import { REST_EXAMPLES } from "@/ui/pattern-docs/examples/rest";
import { GROUPING_EXAMPLES } from "@/ui/pattern-docs/examples/grouping";
import { ALTERNATION_EXAMPLES } from "@/ui/pattern-docs/examples/alternation";
import { CHORDS_EXAMPLES } from "@/ui/pattern-docs/examples/chords";
import { POLYMETER_EXAMPLES } from "@/ui/pattern-docs/examples/polymeter";
import { FAST_EXAMPLES } from "@/ui/pattern-docs/examples/fast";
import { REPLICATE_EXAMPLES } from "@/ui/pattern-docs/examples/replicate";
import { HOLD_EXAMPLES } from "@/ui/pattern-docs/examples/hold";
import { TIES_EXAMPLES } from "@/ui/pattern-docs/examples/ties";
import { SLIDES_EXAMPLES } from "@/ui/pattern-docs/examples/slides";
import { PROBABILITY_EXAMPLES } from "@/ui/pattern-docs/examples/probability";
import { EUCLID_EXAMPLES } from "@/ui/pattern-docs/examples/euclid";
import { COMBINATORS_EXAMPLES } from "@/ui/pattern-docs/examples/combinators";
import { RECORDS_EXAMPLES } from "@/ui/pattern-docs/examples/records";
import { DETERMINISM_EXAMPLES } from "@/ui/pattern-docs/examples/determinism";
import { CHORD_VOCABULARY_EXAMPLES } from "@/ui/pattern-docs/examples/chord-vocabulary";
import { SPLICING_EXAMPLES } from "@/ui/pattern-docs/examples/splicing";
import { BRIDGE_PATTERN_AS_SIGNAL_EXAMPLES } from "@/ui/pattern-docs/examples/bridge-pattern-as-signal";
import { BRIDGE_TRIGGER_DOMAIN_EXAMPLES } from "@/ui/pattern-docs/examples/bridge-trigger-domain";

export { SECTION_GROUPS, SECTIONS } from "@/ui/pattern-docs/examples/sections";

export const EXAMPLES: readonly DocExample[] = [
	...SEQUENCE_EXAMPLES,
	...REST_EXAMPLES,
	...GROUPING_EXAMPLES,
	...ALTERNATION_EXAMPLES,
	...CHORDS_EXAMPLES,
	...POLYMETER_EXAMPLES,
	...FAST_EXAMPLES,
	...REPLICATE_EXAMPLES,
	...HOLD_EXAMPLES,
	...TIES_EXAMPLES,
	...SLIDES_EXAMPLES,
	...PROBABILITY_EXAMPLES,
	...EUCLID_EXAMPLES,
	...COMBINATORS_EXAMPLES,
	...RECORDS_EXAMPLES,
	...DETERMINISM_EXAMPLES,
	...CHORD_VOCABULARY_EXAMPLES,
	...SPLICING_EXAMPLES,
	...BRIDGE_PATTERN_AS_SIGNAL_EXAMPLES,
	...BRIDGE_TRIGGER_DOMAIN_EXAMPLES,
];
