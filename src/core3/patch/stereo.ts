/**
 * The stereo pair `l`/`r`. A stereo module (`pan`) carries both channels and
 * has no mono default output, so a whole-module connection from it either
 * lands on a destination with both `l` and `r` inputs (connect by name) or is
 * a loud error: taking one port would silently drop the other channel.
 */

import type { ModuleSpec } from "../types";

export const STEREO_PORTS = ["l", "r"] as const;

/**
 * A source is stereo when it outputs `l` and `r` and has no mono default
 * output: it declares none (`pan`), or its default is one of the pair.
 */
export function isStereoSource(spec: ModuleSpec): boolean {
	if (!("l" in spec.outs && "r" in spec.outs)) return false;
	return spec.defaultOut === undefined || STEREO_PORTS.includes(spec.defaultOut as "l" | "r");
}

/** A destination takes stereo when it has both `l` and `r` inputs. */
export function takesStereo(spec: ModuleSpec): boolean {
	return "l" in spec.ins && "r" in spec.ins;
}

/** The loud error for a connection that would keep one channel of `source` and drop the other. */
export function droppedChannelError(source: ModuleSpec, into: string): Error {
	return new Error(
		`${into}: '${source.name}' is stereo (outputs l, r) and this connection takes one signal, ` +
			"so it would drop a channel. Tap one channel (x.l or x.r), or connect it whole to a " +
			"module with l and r inputs (e.g. .out()).",
	);
}
