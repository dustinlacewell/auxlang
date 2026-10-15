/**
 * Whole-module connection: passing or chaining a module (no port named)
 * connects ports by name. A stereo source into a destination with `l`/`r`
 * inputs connects l→l and r→r. Any other whole connection feeds the source's
 * default output into the destination's default input; for a stereo source
 * that would drop a channel, so it throws.
 */

import type { InputValue } from "../graph/node";
import type { ModulePorts } from "../types";
import type { HandleData } from "./handle-data";
import { refFromHandle } from "./lift";
import { resolvePatchModule } from "./resolve";
import { STEREO_PORTS, droppedChannelError, isStereoSource, takesStereo } from "./stereo";

/** The input bindings on `dest` for connecting the handle `data` to it whole. */
export function connectWhole(data: HandleData, dest: ModulePorts): Record<string, InputValue> {
	if (!isWholeStereo(data)) {
		return { [dest.defaultIn]: refFromHandle(data, dest.name) };
	}
	if (!takesStereo(dest)) {
		throw droppedChannelError(resolvePatchModule(data.node.module), intoDescription(dest));
	}
	return byName(data);
}

function isWholeStereo(data: HandleData): boolean {
	return data.port === undefined && isStereoSource(resolvePatchModule(data.node.module));
}

/** l→l, r→r, keeping any lane selection. */
function byName(data: HandleData): Record<string, InputValue> {
	const bindings: Record<string, InputValue> = {};
	for (const port of STEREO_PORTS) {
		bindings[port] = refFromHandle({ ...data, port }, port);
	}
	return bindings;
}

function intoDescription(dest: ModulePorts): string {
	return `connecting into '${dest.name}' (inputs: [${Object.keys(dest.ins).join(", ")}], no l/r pair)`;
}
