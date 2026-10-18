/**
 * Parse one part of a module (its tick, a helper) or a signal lambda, with a
 * located failure: every later stage reports through `fail`, which names the
 * module, the part and the line — the file line when the text came from a
 * library file or the patch (source-text.ts).
 */

import type { Node as AcornNode } from "acorn";
import { locateInSource } from "@/engine/dsp/source-text";
import type { SourceOrigin } from "@/engine/types";
import { type FunctionNode, parseFunction } from "./parse-function";
import { violation } from "./violation";

/** Throws the located violation for `node`. */
export type Fail = (node: AcornNode, message: string) => never;

export interface PartSite {
	/** `defmod('noise')` or `lambda`. */
	readonly owner: string;
	/** `tick`, `helper 'step'`, `lambda`. */
	readonly part: string;
	readonly src: string;
	/** Where the text starts in its file, recorded when it was written (types.ts `ModuleSource.origins`). */
	readonly origin?: SourceOrigin | undefined;
}

export interface ParsedPart {
	readonly node: FunctionNode;
	/** The text the node's offsets index (parse-function.ts `expression`). */
	readonly text: string;
	readonly fail: Fail;
}

export function parsePart(site: PartSite): ParsedPart {
	const origin = site.origin ?? locateInSource(site.src);
	const located = { owner: site.owner, part: site.part, origin };
	const fail: Fail = (node, message) => {
		throw violation(located, node.loc?.start.line ?? 1, message);
	};
	const parsed = parseFunction(site.src, `${site.owner} ${site.part}`);
	return { node: parsed.node, text: parsed.expression, fail };
}
