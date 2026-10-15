/**
 * An event's own note identity: the onset of its whole, in absolute beats. A
 * fragment of a note that crosses a cycle edge keeps its note's id. An event
 * with no whole (a continuous signal) is its own note from where its part
 * begins.
 */

import type { Ev } from "../event";
import { rtof } from "../rational";

export const ownNoteId = (ev: Ev): number => rtof((ev.whole ?? ev.part).begin);
