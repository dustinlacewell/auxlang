/**
 * The stereo pair `l`/`r`. A stereo module (`pan`) carries both channels and
 * has no mono default output, so a whole-module connection from it either
 * lands on a destination with both `l` and `r` inputs (connect by name) or is
 * a loud error: taking one port would silently drop the other channel.
 */

import type { ModulePorts } from "../types";

export const STEREO_PORTS = ["l", "r"] as const;

/** A source is stereo when it outputs `l` and `r` and declares no default output (`pan`, `out`). */
export function isStereoSource(spec: ModulePorts): boolean {
	return "l" in spec.outs && "r" in spec.outs && spec.defaultOut === undefined;
}

/** A destination takes stereo when it has both `l` and `r` inputs. */
export function takesStereo(spec: ModulePorts): boolean {
	return "l" in spec.ins && "r" in spec.ins;
}

/** The loud error for a connection that would keep one channel of `source` and drop the other. */
export function droppedChannelError(source: ModulePorts, into: string): Error {
	return new Error(
		`${into}: '${source.name}' is stereo (outputs l, r) and this connection takes one signal, ` +
			"so it would drop a channel. Tap one channel (x.l or x.r), or connect it whole to a " +
			"module with l and r inputs (e.g. .out()).",
	);
}
