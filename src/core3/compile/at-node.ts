/**
 * Run one compile step for one node; a loud error it throws points at the
 * call that made the node (MANIFESTO §10.1), unless it already points at
 * something more exact (a notation token).
 */

import type { GNode } from "../graph/node";
import { siteRange } from "../source/active-source";
import { locateError } from "../source/located-error";

export function atNode<T>(node: GNode, step: () => T): T {
	try {
		return step();
	} catch (err) {
		throw locateError(err, siteRange(node.site));
	}
}
