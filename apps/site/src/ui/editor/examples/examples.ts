/**
 * The editor's example patches, in menu order. Each source is the body of a
 * patch function. apps/site/src/tests/examples/site-examples.test.ts
 * compiles and renders every one.
 */

import { chaconneExample } from "@/ui/editor/examples/chaconne";
import { coastlineExample } from "@/ui/editor/examples/coastline";
import { crossFmExample } from "@/ui/editor/examples/cross-fm";
import { drumsExample } from "@/ui/editor/examples/drums";
import type { Example } from "@/ui/editor/examples/example";
import { firstSoundExample } from "@/ui/editor/examples/first-sound";
import { karplusExample } from "@/ui/editor/examples/karplus";
import { liveControlsExample } from "@/ui/editor/examples/live-controls";
import { liveModuleExample } from "@/ui/editor/examples/live-module";
import { mirrorCanonExample } from "@/ui/editor/examples/mirror-canon";
import { mountainKingFugueExample } from "@/ui/editor/examples/mountain-king-fugue";
import { namedMixerExample } from "@/ui/editor/examples/named-mixer";
import { patternAsSignalExample } from "@/ui/editor/examples/pattern-as-signal";
import { patternRecordsExample } from "@/ui/editor/examples/pattern-records";
import { patternsAsValuesExample } from "@/ui/editor/examples/patterns-as-values";
import { pocketRocketExample } from "@/ui/editor/examples/pocket-rocket";
import { polyChordsExample } from "@/ui/editor/examples/poly-chords";
import { puttinOnTheRitzExample } from "@/ui/editor/examples/puttin-on-the-ritz";
import { seededChanceExample } from "@/ui/editor/examples/seeded-chance";
import { signalSpliceExample } from "@/ui/editor/examples/signal-splice";
import { smokeSignalExample } from "@/ui/editor/examples/smoke-signal";
import { subpatchExample } from "@/ui/editor/examples/subpatch";
import { syncedEchoExample } from "@/ui/editor/examples/synced-echo";
import { wideSawsExample } from "@/ui/editor/examples/wide-saws";

export const EXAMPLES: readonly Example[] = [
	smokeSignalExample,
	puttinOnTheRitzExample,
	coastlineExample,
	mirrorCanonExample,
	mountainKingFugueExample,
	chaconneExample,
	pocketRocketExample,
	firstSoundExample,
	patternsAsValuesExample,
	patternAsSignalExample,
	karplusExample,
	crossFmExample,
	syncedEchoExample,
	liveModuleExample,
	subpatchExample,
	polyChordsExample,
	wideSawsExample,
	drumsExample,
	seededChanceExample,
	namedMixerExample,
	signalSpliceExample,
	patternRecordsExample,
	liveControlsExample,
];

/** The patch shown when the editor first loads. */
export const DEFAULT_EXAMPLE = smokeSignalExample.source;
