/**
 * Chainable output ref - wraps OutputRef to enable chaining.
 *
 * Allows: seq().cv.saw() - where .cv returns an OutputRef that can chain to devices.
 */

import { createDeviceNode } from "../device/create-device-node";
import { getDeviceFactory, getDeviceSpec } from "../device/registry";
import type { Node } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";
import type { ConfigValue } from "../signal/config-value";
import { parseArgs } from "./parse-args";

export interface ChainableOutputRef extends OutputRef {
	[key: string]: unknown;
}

// Set by wrap.ts to avoid circular dependency
let wrapFn: ((node: Node | Node[]) => unknown) | null = null;

export function setWrapFn(fn: (node: Node | Node[]) => unknown): void {
	wrapFn = fn;
}

/**
 * Wrap an array of OutputRefs to enable chaining.
 * polySeq.cv.tri() → maps tri across all refs
 */
export function wrapOutputRefArray(refs: OutputRef[]): OutputRef[] {
	const handler: ProxyHandler<OutputRef[]> = {
		get(target, prop: string | symbol) {
			if (typeof prop === "symbol") return target[prop as unknown as number];

			// Array methods
			if (prop === "length" || prop === "map" || prop === "forEach" || prop === "filter") {
				return target[prop as keyof OutputRef[]];
			}

			// Numeric index
			if (!Number.isNaN(Number(prop))) {
				return target[Number(prop)];
			}

			// Device chaining: refs.tri() → maps to array of nodes
			const chainFactory = getDeviceFactory(prop);
			if (chainFactory) {
				return (...args: unknown[]) => {
					const targetSpec = getDeviceSpec(prop);
					if (!targetSpec) {
						throw new Error(`Unknown device: ${prop}`);
					}

					const { inputs, config } = parseArgs(args, targetSpec, targetSpec.defaultInput);

					if (inputs[targetSpec.defaultInput] !== undefined) {
						throw new Error(
							`Cannot set '${targetSpec.defaultInput}' when chaining - it's already bound from the chain source`,
						);
					}

					const newNodes = target.flatMap((ref) => {
						const boundInputs = { ...inputs, [targetSpec.defaultInput]: ref };
						const result = createDeviceNode(prop, targetSpec, boundInputs, config as Record<string, ConfigValue>);
						return Array.isArray(result) ? result : [result];
					});

					if (!wrapFn) {
						throw new Error("wrapFn not initialized - call setWrapFn first");
					}
					return wrapFn(newNodes);
				};
			}

			return undefined;
		},
	};

	return new Proxy(refs, handler);
}

export function wrapOutputRef(outputRef: OutputRef): ChainableOutputRef {
	const handler: ProxyHandler<OutputRef> = {
		get(target, prop: string | symbol) {
			if (typeof prop === "symbol") return undefined;

			// Plain OutputRef properties pass through
			if (prop === "ref" || prop === "out") {
				return target[prop as keyof OutputRef];
			}

			// Device chaining: outputRef.saw() → new saw node
			const chainFactory = getDeviceFactory(prop);
			if (chainFactory) {
				return (...args: unknown[]) => {
					const targetSpec = getDeviceSpec(prop);
					if (!targetSpec) {
						throw new Error(`Unknown device: ${prop}`);
					}

					// Skip default input in positional args since it's bound from chain
					const { inputs, config } = parseArgs(args, targetSpec, targetSpec.defaultInput);

					// Check if default input is being set when chaining
					if (inputs[targetSpec.defaultInput] !== undefined) {
						throw new Error(
							`Cannot set '${targetSpec.defaultInput}' when chaining - it's already bound from the chain source`,
						);
					}

					const boundInputs = { ...inputs, [targetSpec.defaultInput]: target };
					const result = createDeviceNode(prop, targetSpec, boundInputs, config as Record<string, ConfigValue>);

					if (!wrapFn) {
						throw new Error("wrapFn not initialized - call setWrapFn first");
					}
					return wrapFn(result);
				};
			}

			return undefined;
		},
	};

	return new Proxy(outputRef, handler) as ChainableOutputRef;
}

