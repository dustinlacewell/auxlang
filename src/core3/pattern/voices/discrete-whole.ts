/**
 * An event's whole, for voices that need onsets. A continuous signal has no
 * whole and no onsets, so `stable` and `rr` cannot give it lanes: a loud error.
 */

import type { Ev, Span } from "../event";

export function discreteWhole(ev: Ev): Span {
	if (ev.whole === null) {
		throw new Error(
			'voices("stable"/"rr"): a continuous signal has no onsets to give lanes; segment it first',
		);
	}
	return ev.whole;
}
