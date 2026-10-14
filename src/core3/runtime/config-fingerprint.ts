/**
 * Config fingerprint: a deterministic string of a node's effective config
 * (spec defaults overlaid with the node's own). Config is not identity, but a
 * module whose own config changed starts fresh at migration — its state may
 * hold data derived from the old config. Sorted keys, function values dropped.
 */

import type { ModuleSpec, PNode } from "../types";

export function configFingerprint(spec: ModuleSpec, node: PNode): string {
	return stableStringify({ ...spec.config, ...node.config });
}

function stableStringify(value: unknown): string {
	if (value === null || typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "function" || value === undefined) return "";
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	const obj = value as Record<string, unknown>;
	const entries = Object.keys(obj)
		.sort()
		.filter((k) => typeof obj[k] !== "function" && obj[k] !== undefined)
		.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
	return `{${entries.join(",")}}`;
}
