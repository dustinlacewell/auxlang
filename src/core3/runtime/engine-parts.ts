/**
 * Everything a built engine runs on (build/engine-build.ts makes it,
 * live-engine.ts runs it): the node runs and value buffers the driver walks,
 * the layout and feedback reads a hand-over writes through, and the
 * identities that key the state it carries on.
 */

import type { KeyedIdentity } from "../types";
import type { Driver, ValueBuffers } from "./driver";
import type { FeedbackRead } from "./feedback";
import type { CarryPair } from "./hand-over/carry-states";
import type { NodeRun } from "./node-run";
import type { OutputLayout } from "./output-slots";

export interface EngineParts {
	readonly sampleRate: number;
	readonly identities: readonly KeyedIdentity[];
	/** New node index → the old key it takes state and feedback from at a hand-over. */
	readonly paired: ReadonlyMap<number, string>;
	/** The lanes that carry from the build's source engine, planned during the build. */
	readonly carry: readonly CarryPair[];
	readonly layout: OutputLayout;
	readonly feedback: readonly FeedbackRead[];
	readonly runs: readonly NodeRun[];
	readonly bufs: ValueBuffers;
	readonly driver: Driver;
}
