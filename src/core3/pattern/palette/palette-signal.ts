/**
 * A palette member: what a template splice can put in a palette pattern — a
 * plain number, or a signal (the chainable Handle a module factory returns,
 * e.g. `lfo(0.3, 60, 96)`).
 */

import { isHandle } from "../../patch/handle-data";
import type { Handle } from "../../patch/handle-data";

export type PaletteSignal = number | Handle;

export function isSignalMember(v: PaletteSignal): v is Handle {
	return isHandle(v);
}
