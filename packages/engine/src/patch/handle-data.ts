/**
 * Handle identity — the private symbol that lets the rest of the patch layer
 * unwrap a Handle proxy back into its `{ node, port?, lane? }` data without
 * creating an import cycle with handle.ts.
 */

import type { GNode } from "../graph/node";

export const HANDLE = Symbol("auxlang.handle");

export interface HandleData {
	readonly node: GNode;
	readonly port?: string;
	readonly lane?: number;
}

/**
 * The user-facing fluent wrapper. Everything is proxied, so the static type
 * is deliberately loose: callable (sets default input) plus arbitrary
 * chain/tap/setter properties.
 */
export interface Handle {
	(value: unknown): Handle;
	// biome-ignore lint/suspicious/noExplicitAny: proxy surface is dynamic by design
	[key: string]: any;
}

export function isHandle(v: unknown): v is Handle {
	return typeof v === "function" && (v as unknown as Record<symbol, unknown>)[HANDLE] !== undefined;
}

export function handleData(h: Handle): HandleData {
	return (h as unknown as Record<symbol, unknown>)[HANDLE] as HandleData;
}
