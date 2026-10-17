/**
 * The stereo pair `l`/`r`. A stereo module (`pan`) carries both channels and
 * has no mono default output, so a whole-module connection from it either
 * lands on a destination with both `l` and `r` inputs (connect by name) or is
 * a loud error: taking one port would silently drop the other channel.
 */

import { nodePorts } from "@/core3/module/node-ports";
import { openGroup } from "@/core3/module/group-decls";
import type { ModulePorts } from "../types";

export const STEREO_PORTS = ["l", "r"] as const;

/** A source is stereo when it outputs `l` and `r` and declares no default output (`pan`, `out`). */
export function isStereoSource(spec: ModulePorts): boolean {
	const outs = nodePorts(spec).outs;
	return "l" in outs && "r" in outs && spec.defaultOut === undefined;
}

/** A destination takes stereo when it has both `l` and `r` inputs. */
export function takesStereo(spec: ModulePorts): boolean {
	const ins = nodePorts(spec).ins;
	return "l" in ins && "r" in ins;
}

/**
 * The loud error for a connection that would keep one channel of `source` and
 * drop the other. `into` describes where the connection lands; when it is the
 * destination module itself (a whole-module connection, connect.ts) and that
 * module has an open input group, the error adds the member-passing fix.
 */
export function droppedChannelError(source: ModulePorts, into: string | ModulePorts): Error {
	const where = typeof into === "string" ? into : intoDescription(into);
	const base =
		`${where}: '${source.name}' is stereo (outputs l, r) and this connection takes one signal, ` +
		"so it would drop a channel. Tap one channel (x.l or x.r), or connect it whole to a " +
		"module with l and r inputs (e.g. .out()).";
	const hint = typeof into === "string" ? "" : openGroupHint(into);
	return new Error(base + hint);
}

function intoDescription(dest: ModulePorts): string {
	return `connecting into '${dest.name}' (inputs: [${Object.keys(nodePorts(dest).ins).join(", ")}], no l/r pair)`;
}

function openGroupHint(dest: ModulePorts): string {
	const group = openGroup(dest, "ins");
	return group === undefined ? "" : ` Or pass the channels as members: ${dest.name}({ l: x.l, r: x.r })`;
}
