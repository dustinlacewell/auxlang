/**
 * Chainable voice ref - wraps VoiceRef to enable chaining and output access.
 *
 * Allows: seq("{c4,e4}").voices[0].saw() - where voices[0] returns a VoiceRef that can chain.
 * Also: seq("{c4,e4}").voices[0].gate.ad() - where .gate sets the output on the VoiceRef.
 */

import { createDeviceNode } from "../device/create-device-node";
import { getDeviceFactory, getDeviceSpec } from "../device/registry";
import type { Node } from "../graph/node";
import type { ConfigValue } from "../signal/config-value";
import type { VoiceRef } from "../signal/node-input";
import { parseArgs } from "./parse-args";

export interface ChainableVoiceRef extends VoiceRef {
	[key: string]: unknown;
}

// Set by wrap.ts to avoid circular dependency
let wrapFn: ((node: Node | Node[]) => unknown) | null = null;

export function setVoiceRefWrapFn(fn: (node: Node | Node[]) => unknown): void {
	wrapFn = fn;
}

/**
 * Wrap a VoiceRef to enable chaining and output access.
 */
export function wrapVoiceRef(voiceRef: VoiceRef, sourceDevice: string): ChainableVoiceRef {
	const sourceSpec = getDeviceSpec(sourceDevice);
	const outputs = sourceSpec?.outputs ?? [];

	const handler: ProxyHandler<VoiceRef> = {
		get(target, prop: string | symbol) {
			if (typeof prop === "symbol") return undefined;

			// Plain VoiceRef properties pass through
			if (prop === "type" || prop === "source" || prop === "index" || prop === "output") {
				return target[prop as keyof VoiceRef];
			}

			// Output access: voiceRef.gate → new VoiceRef with output set
			if (outputs.includes(prop)) {
				const newRef: VoiceRef = { ...target, output: prop };
				return wrapVoiceRef(newRef, sourceDevice);
			}

			// Device chaining: voiceRef.saw() → new saw node with VoiceRef as input
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

					// Use the VoiceRef directly as the input - it will be resolved at expansion time
					const boundInputs = { ...inputs, [targetSpec.defaultInput]: target };
					const result = createDeviceNode(prop, targetSpec, boundInputs, config as Record<string, ConfigValue>);

					if (!wrapFn) {
						throw new Error("wrapFn not initialized - call setVoiceRefWrapFn first");
					}
					return wrapFn(result);
				};
			}

			return undefined;
		},
	};

	return new Proxy(voiceRef, handler) as ChainableVoiceRef;
}

/**
 * Create a voices accessor proxy for a node.
 * Returns a proxy that intercepts [N] to create VoiceRefs.
 */
export function createVoicesAccessor(nodeId: string, deviceName: string): VoiceRef[] {
	const handler: ProxyHandler<VoiceRef[]> = {
		get(_target, prop: string | symbol) {
			if (typeof prop === "symbol") return undefined;

			// Numeric index: voices[0] → VoiceRef
			if (!Number.isNaN(Number(prop))) {
				const index = Number(prop);
				const voiceRef: VoiceRef = {
					type: "voiceRef",
					source: nodeId,
					index,
				};
				return wrapVoiceRef(voiceRef, deviceName);
			}

			// Array-like length (unknown at API time, but needed for spread operator)
			if (prop === "length") {
				// Return undefined - length isn't known until expansion
				return undefined;
			}

			return undefined;
		},
	};

	// Use empty array as target - the proxy intercepts all access
	return new Proxy([] as VoiceRef[], handler);
}
