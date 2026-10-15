/**
 * `rr` placement: the kth note onset takes lane k mod n, whatever that lane
 * holds, so each release tail rings in its own lane until its turn comes
 * round. A voice still sounding there is cut off.
 */

import type { Place } from "./assign-cycle";

export const placeRr: Place = (lanes, notes, _t, onsets) =>
	notes.map((_, i) => (onsets + i) % lanes.length);
