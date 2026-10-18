/**
 * The default output a single-port read takes. A module that declares none
 * (a stereo module, MANIFESTO §5) has no port to give, so asking is a loud
 * error naming `where` and the outputs it could tap instead.
 */

import { nodePorts } from "@/engine/dsp/node-ports";
import type { ModulePorts } from "../types";

export function defaultOutOf(spec: ModulePorts, where: string): string {
	if (spec.defaultOut !== undefined) return spec.defaultOut;
	throw new Error(
		`${where}: '${spec.name}' has no default output. Tap one by name: ` +
			`[${Object.keys(nodePorts(spec).outs).join(", ")}].`,
	);
}
