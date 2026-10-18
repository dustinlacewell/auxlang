/**
 * The whole content of the module-docs page, as DATA. Every entry is a real
 * core3 patch string that compiles through the eval path and renders 2 s
 * non-silent, bounded, finite — the scratch script and the vitest test both
 * hold this file to that bar so the docs can never rot.
 *
 * Format law (see .claude/rules/interactive-examples.md): each AUDIBLE module
 * gets default / all-params / one-per-modulated-param / showcase. Pure-math
 * utils get abbreviated treatment (default + one modulated + a showcase only
 * where it is audibly meaningful). Descriptions say what the listener should
 * EXPECT to hear (aux-style voice, terse). Prefer sin/tri; modulate with slow
 * sin LFOs (0.2 over time, 0.5 to ping-pong two values).
 */

import type { DocExample } from "@/ui/docs-kit/doc-example";
import { SOURCES_EXAMPLES } from "@/ui/module-docs/examples/sources";
import { FILTERS_EXAMPLES } from "@/ui/module-docs/examples/filters";
import { ENVELOPES_EXAMPLES } from "@/ui/module-docs/examples/envelopes";
import { EFFECTS_EXAMPLES } from "@/ui/module-docs/examples/effects";
import { UTILS_EXAMPLES } from "@/ui/module-docs/examples/utils";
import { MATH_EXAMPLES } from "@/ui/module-docs/examples/math";
import { TIMING_EXAMPLES } from "@/ui/module-docs/examples/timing";
import { DRUMS_EXAMPLES } from "@/ui/module-docs/examples/drums";
import { BRIDGE_EXAMPLES } from "@/ui/module-docs/examples/bridge";

export const EXAMPLES: readonly DocExample[] = [
	...SOURCES_EXAMPLES,
	...FILTERS_EXAMPLES,
	...ENVELOPES_EXAMPLES,
	...EFFECTS_EXAMPLES,
	...UTILS_EXAMPLES,
	...MATH_EXAMPLES,
	...TIMING_EXAMPLES,
	...DRUMS_EXAMPLES,
	...BRIDGE_EXAMPLES,
];
