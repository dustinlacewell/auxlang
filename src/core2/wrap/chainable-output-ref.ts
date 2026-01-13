/**
 * Chainable output ref - wraps OutputRef to enable chaining and output access.
 *
 * Features:
 * - Device chaining: seq.cv.saw() → new saw node
 * - Sibling output access: seq.cv.gate → OutputRef to gate output
 * - .apply(fn) - call fn with this chainable ref
 * - .out() - output this ref directly
 */

import { createDeviceNode } from "../device/create-device-node";
import { getDeviceFactory, getDeviceSpec } from "../device/registry";
import { getBuilder } from "../graph/graph-builder";
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
 * Get the device name for a node ID by looking it up in the builder.
 */
function getSourceDevice(nodeId: string): string | undefined {
	const node = getBuilder().getNode(nodeId);
	return node?.device;
}

/**
 * Check if value is a Node (has id, device).
 */
function isNode(value: unknown): value is Node {
	if (value === null || value === undefined) return false;
	const t = typeof value;
	if (t !== "object" && t !== "function") return false;
	const v = value as Record<string, unknown>;
	return "id" in v && "device" in v && typeof v.id === "string" && typeof v.device === "string";
}

/**
 * Wrap an OutputRef to enable chaining, output access, and apply.
 */
export function wrapOutputRef(outputRef: OutputRef): ChainableOutputRef {
	const handler: ProxyHandler<OutputRef> = {
		get(target, prop: string | symbol) {
			if (typeof prop === "symbol") return undefined;

			// Plain OutputRef properties pass through
			if (prop === "ref" || prop === "out" || prop === "voice") {
				return target[prop as keyof OutputRef];
			}

			// .apply(fn) - call fn with this chainable ref and return result
			if (prop === "apply") {
				return <T>(fn: (ref: ChainableOutputRef) => T): T => {
					return fn(wrapOutputRef(target));
				};
			}

			// .out() - output this ref directly
			if (prop === "out") {
				return () => {
					const outSpec = getDeviceSpec("out");
					if (!outSpec) throw new Error("out device not registered");
					createDeviceNode("out", outSpec, { input: target }, {});
				};
			}

			// Sibling output access: ref.gate → new OutputRef with different output
			const sourceDevice = getSourceDevice(target.ref);
			if (sourceDevice) {
				const sourceSpec = getDeviceSpec(sourceDevice);
				if (sourceSpec?.outputs.includes(prop)) {
					const newRef: OutputRef = { ref: target.ref, out: prop, voice: target.voice };
					return wrapOutputRef(newRef);
				}
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

/**
 * Wrap an array of OutputRefs to enable chaining and apply.
 * polySeq.cv.tri() → maps tri across all refs
 * polyRefs.apply(v => ...) → maps fn across all refs
 */
export function wrapOutputRefArray(refs: OutputRef[]): ChainableOutputRef[] {
	const handler: ProxyHandler<OutputRef[]> = {
		get(target, prop: string | symbol) {
			if (typeof prop === "symbol") return target[prop as unknown as number];

			// Array methods
			if (prop === "length" || prop === "map" || prop === "forEach" || prop === "filter") {
				return target[prop as keyof OutputRef[]];
			}

			// Numeric index - return wrapped individual ref
			if (!Number.isNaN(Number(prop))) {
				const ref = target[Number(prop)];
				return ref ? wrapOutputRef(ref) : undefined;
			}

			// .apply(fn) - map fn across all refs, wrap result as WrappedArray if nodes
			if (prop === "apply") {
				return <T>(fn: (ref: ChainableOutputRef) => T): unknown => {
					const results = target.map((ref) => fn(wrapOutputRef(ref)));
					// If results are nodes, wrap as WrappedArray for continued chaining
					if (results.length > 0 && isNode(results[0])) {
						if (!wrapFn) {
							throw new Error("wrapFn not initialized - call setWrapFn first");
						}
						return wrapFn(results as Node[]);
					}
					return results;
				};
			}

			// .out() - output all refs
			if (prop === "out") {
				return () => {
					const outSpec = getDeviceSpec("out");
					if (!outSpec) throw new Error("out device not registered");
					// Create one out node with array of refs (will be expanded)
					createDeviceNode("out", outSpec, { input: target }, {});
				};
			}

			// Sibling output access: refs.gate → array of OutputRefs to gate output
			if (target.length > 0) {
				const sourceDevice = getSourceDevice(target[0]!.ref);
				if (sourceDevice) {
					const sourceSpec = getDeviceSpec(sourceDevice);
					if (sourceSpec?.outputs.includes(prop)) {
						const newRefs = target.map((ref): OutputRef => ({ ref: ref.ref, out: prop, voice: ref.voice }));
						return wrapOutputRefArray(newRefs);
					}
				}
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

	return new Proxy(refs, handler) as ChainableOutputRef[];
}
