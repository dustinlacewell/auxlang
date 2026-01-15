/**
 * Wraps plain Node objects with chainable proxy behavior.
 *
 * Enables the fluent API: saw(440).lpf(800).gain(0.5)
 */

import { createDeviceNode } from "../device/create-device-node";
import type { DeviceSpec } from "../device/device-spec";
import { getDeviceFactory, getDeviceSpec } from "../device/registry";
import { createNode } from "../graph/create-node";
import { getBuilder } from "../graph/graph-builder";
import type { Node } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";
import type { ConfigValue } from "../signal/config-value";
import type { NodeInput } from "../signal/node-input";
import { setWrapFn, wrapOutputRef, wrapOutputRefArray } from "./chainable-output-ref";
import { parseArgs } from "./parse-args";

/** Symbol to mark input setter functions */
export const INPUT_SETTER = Symbol("inputSetter");

/** Symbol to mark chain method functions */
export const CHAIN_METHOD = Symbol("chainMethod");

/** Info attached to input setter functions */
export interface InputSetterInfo {
	device: string;
	input: string;
}

/** Info attached to chain method functions */
export interface ChainMethodInfo {
	sourceDevice: string;
	targetDevice: string;
}

/** Check if a value is an input setter function */
export function isInputSetter(value: unknown): value is Function & { [INPUT_SETTER]: InputSetterInfo } {
	return typeof value === "function" && INPUT_SETTER in value;
}

/** Check if a value is an uncalled chain method */
export function isChainMethod(value: unknown): value is Function & { [CHAIN_METHOD]: ChainMethodInfo } {
	return typeof value === "function" && CHAIN_METHOD in value;
}

export type Wrapped<T extends Node | Node[]> = T extends Node[] ? WrappedArray : WrappedNode;

export interface WrappedNode extends Node {
	(value: NodeInput): WrappedNode;
	out(): void;
	[key: string]: unknown;
}

export interface WrappedArray extends Array<Node> {
	(value: NodeInput): WrappedArray;
	out(): void;
	[key: string]: unknown;
}

export function wrap<T extends Node | Node[]>(value: T): Wrapped<T> {
	if (Array.isArray(value)) {
		return wrapArray(value) as Wrapped<T>;
	}
	return wrapNode(value) as Wrapped<T>;
}

function wrapNode(node: Node): WrappedNode {
	const spec = getDeviceSpec(node.device);
	if (!spec) {
		throw new Error(`Unknown device: ${node.device}`);
	}

	const handler: ProxyHandler<Node> = {
		get(target, prop: string | symbol) {
			if (typeof prop === "symbol") return undefined;

			// Plain node properties pass through
			if (prop in target) {
				return target[prop as keyof Node];
			}

			// .out() method - creates an out node
			if (prop === "out") {
				return () => {
					const outSpec = getDeviceSpec("out");
					if (!outSpec) throw new Error("out device not registered");
					const ref: OutputRef = { ref: target.id, out: spec.defaultOutput };
					const outNode = createDeviceNode("out", outSpec, { input: ref }, {});
					if (Array.isArray(outNode)) {
						for (const n of outNode) getBuilder().addNode(n);
					} else {
						getBuilder().addNode(outNode);
					}
				};
			}

			// .apply(fn) - call fn with this wrapped node and return the result
			if (prop === "apply") {
				return <T>(fn: (node: WrappedNode) => T): T => fn(wrap(target) as WrappedNode);
			}

			// .voices accessor - returns proxy for voice access via OutputRef with voice field
			if (prop === "voices") {
				return createVoicesAccessor(target.id, spec.defaultOutput);
			}

			// Output access: node.audio → ChainableOutputRef
			if (spec.outputs.includes(prop)) {
				return wrapOutputRef({ ref: target.id, out: prop });
			}

			// Input setter: node.freq(440) → new wrapped node
			if (prop in spec.inputs) {
				const setter = (value: NodeInput) => {
					const newNode = createDeviceNode(
						target.device,
						spec,
						{ ...target.inputs, [prop]: value },
						target.config as Record<string, ConfigValue>,
					);
					return wrap(newNode);
				};
				// Mark as input setter so we can detect misuse as a signal
				(setter as unknown as Record<symbol, InputSetterInfo>)[INPUT_SETTER] = {
					device: target.device,
					input: prop,
				};
				return setter;
			}

			// Device chaining: node.lpf() → new lpf node
			const chainFactory = getDeviceFactory(prop);
			if (chainFactory) {
				return createChainMethod(target, spec, prop);
			}

			throw new Error(
				`'${prop}' is not an input, output, or device on '${target.device}'. ` +
				`Available: inputs=[${Object.keys(spec.inputs).join(", ")}], outputs=[${spec.outputs.join(", ")}]`
			);
		},

		apply(target, _thisArg, args) {
			// node(value) sets default input
			const [value] = args;
			const newNode = createNode(target.device, { ...target.inputs, [spec.defaultInput]: value }, target.config);
			return wrap(newNode);
		},
	};

	// Make it callable
	const callable = function () {} as unknown as WrappedNode;
	Object.setPrototypeOf(callable, node);
	Object.assign(callable, node);

	return new Proxy(callable, handler) as WrappedNode;
}

function createChainMethod(sourceNode: Node, sourceSpec: DeviceSpec, targetDevice: string) {
	const method = (...args: unknown[]) => {
		const targetSpec = getDeviceSpec(targetDevice);
		if (!targetSpec) {
			throw new Error(`Unknown device: ${targetDevice}`);
		}

		const outputRef: OutputRef = { ref: sourceNode.id, out: sourceSpec.defaultOutput };
		// Skip default input in positional args since it's bound from chain
		const { inputs: parsedInputs, config: parsedConfig } = parseArgs(args, targetSpec, targetSpec.defaultInput);

		// Check if default input is being set when chaining
		if (parsedInputs[targetSpec.defaultInput] !== undefined) {
			throw new Error(
				`Cannot set '${targetSpec.defaultInput}' when chaining - it's already bound from the chain source`,
			);
		}

		const inputs = { ...parsedInputs, [targetSpec.defaultInput]: outputRef };
		const result = createDeviceNode(targetDevice, targetSpec, inputs, parsedConfig as Record<string, ConfigValue>);
		return wrap(result);
	};
	// Mark as chain method so we can detect misuse as a signal
	(method as unknown as Record<symbol, ChainMethodInfo>)[CHAIN_METHOD] = {
		sourceDevice: sourceNode.device,
		targetDevice,
	};
	return method;
}

function wrapArray(nodes: Node[]): WrappedArray {
	if (nodes.length === 0) {
		return [] as unknown as WrappedArray;
	}

	const firstNode = nodes[0]!;
	const spec = getDeviceSpec(firstNode.device);
	if (!spec) {
		throw new Error(`Unknown device: ${firstNode.device}`);
	}

	const handler: ProxyHandler<Node[]> = {
		get(_target, prop: string | symbol) {
			if (typeof prop === "symbol") return nodes[prop as unknown as number];

			// Array methods - use nodes, not target (which is the callable function)
			if (prop === "length" || prop === "map" || prop === "forEach" || prop === "filter" || prop === "find") {
				return nodes[prop as keyof Node[]];
			}

			// Numeric index
			if (!Number.isNaN(Number(prop))) {
				return nodes[Number(prop)];
			}

			// .out() method - creates out nodes for each voice
			if (prop === "out") {
				return () => {
					const outSpec = getDeviceSpec("out");
					if (!outSpec) throw new Error("out device not registered");
					// Create one out node with array of refs (will be expanded)
					const refs = nodes.map((n): OutputRef => ({ ref: n.id, out: spec.defaultOutput }));
					const outNode = createDeviceNode("out", outSpec, { input: refs }, {});
					if (Array.isArray(outNode)) {
						for (const n of outNode) getBuilder().addNode(n);
					} else {
						getBuilder().addNode(outNode);
					}
				};
			}

			// .apply(fn) - call fn with this wrapped array and return the result
			if (prop === "apply") {
				return <T>(fn: (arr: WrappedArray) => T): T => fn(wrap(nodes) as WrappedArray);
			}

			// Output access: maps to chainable array of OutputRefs
			if (spec.outputs.includes(prop)) {
				return wrapOutputRefArray(nodes.map((n) => ({ ref: n.id, out: prop })));
			}

			// Input setter: maps across all nodes
			if (prop in spec.inputs) {
				const setter = (value: NodeInput) => {
					const newNodes = nodes.map((n, i) => {
						const v = Array.isArray(value) ? value[i % value.length]! : value;
						return createNode(n.device, { ...n.inputs, [prop]: v }, n.config);
					});
					return wrap(newNodes);
				};
				// Mark as input setter so we can detect misuse as a signal
				(setter as unknown as Record<symbol, InputSetterInfo>)[INPUT_SETTER] = {
					device: firstNode.device,
					input: prop,
				};
				return setter;
			}

			// Device chaining: maps factory across all nodes
			const chainFactory = getDeviceFactory(prop);
			if (chainFactory) {
				return (...args: unknown[]) => {
					const targetSpec = getDeviceSpec(prop);
					if (!targetSpec) {
						throw new Error(`Unknown device: ${prop}`);
					}

					// Skip default input in positional args since it's bound from chain
					const { inputs: parsedInputs, config: parsedConfig } = parseArgs(args, targetSpec, targetSpec.defaultInput);

					// Check if default input is being set when chaining
					if (parsedInputs[targetSpec.defaultInput] !== undefined) {
						throw new Error(
							`Cannot set '${targetSpec.defaultInput}' when chaining - it's already bound from the chain source`,
						);
					}

					// Polyphonic devices receive all voices as an array (spread, mix, etc.)
					if (targetSpec.polyphonic) {
						const refs: OutputRef[] = nodes.map((n) => ({ ref: n.id, out: spec.defaultOutput }));
						const inputs = { ...parsedInputs, [targetSpec.defaultInput]: refs };
						const result = createDeviceNode(prop, targetSpec, inputs, parsedConfig as Record<string, ConfigValue>);
						return wrap(result);
					}

					// Non-polyphonic: map across each voice
					const newNodes = nodes.flatMap((n, i) => {
						const outputRef: OutputRef = { ref: n.id, out: spec.defaultOutput };
						const resolvedInputs = resolveInputsForVoice(parsedInputs, i);
						const inputs = { ...resolvedInputs, [targetSpec.defaultInput]: outputRef };
						const result = createDeviceNode(prop, targetSpec, inputs, parsedConfig as Record<string, ConfigValue>);
						return Array.isArray(result) ? result : [result];
					});
					return wrap(newNodes);
				};
			}

			throw new Error(
				`'${prop}' is not an input, output, or device on '${firstNode.device}'. ` +
				`Available: inputs=[${Object.keys(spec.inputs).join(", ")}], outputs=[${spec.outputs.join(", ")}]`
			);
		},

		apply(_target, _thisArg, args) {
			// array(value) sets default input on all nodes
			const [value] = args;
			const newNodes = nodes.map((n, i) => {
				const v = Array.isArray(value) ? value[i % value.length] : value;
				return createNode(n.device, { ...n.inputs, [spec.defaultInput]: v }, n.config);
			});
			return wrap(newNodes);
		},
	};

	// Make it callable
	const callable = function () {} as unknown as WrappedArray;
	Object.setPrototypeOf(callable, nodes);
	Object.assign(callable, nodes);

	return new Proxy(callable, handler) as WrappedArray;
}

/**
 * Check if value is a WrappedArray (poly of nodes).
 * WrappedArray is a Proxy around a function with numeric indices.
 */
function isWrappedArray(value: unknown): value is Node[] {
	if (typeof value !== "function") return false;
	if (!("length" in value)) return false;
	const v = value as { length: number; 0?: unknown };
	if (typeof v.length !== "number" || v.length === 0) return false;
	// Check if first element looks like a node
	const first = v[0];
	return first !== undefined && typeof first === "object" && first !== null && "id" in first && "device" in first;
}

/**
 * Resolve inputs for a specific voice index.
 * Distributes poly values (number arrays, WrappedArrays) to the appropriate voice.
 */
function resolveInputsForVoice(inputs: Record<string, NodeInput>, voiceIndex: number): Record<string, NodeInput> {
	const result: Record<string, NodeInput> = {};
	for (const [key, value] of Object.entries(inputs)) {
		// Number array - distribute by index
		if (Array.isArray(value) && typeof value[0] === "number") {
			result[key] = value[voiceIndex % value.length] ?? 0;
		}
		// WrappedArray (poly nodes) - extract voice and convert to OutputRef
		else if (isWrappedArray(value)) {
			const node = value[voiceIndex % value.length]!;
			const spec = getDeviceSpec(node.device);
			const defaultOutput = spec?.defaultOutput ?? "out";
			result[key] = { ref: node.id, out: defaultOutput };
		}
		// Everything else passes through
		else {
			result[key] = value;
		}
	}
	return result;
}

/**
 * Create a voices accessor proxy for a node.
 * Returns a proxy that intercepts [N] to create OutputRefs with voice field.
 */
function createVoicesAccessor(nodeId: string, defaultOutput: string): OutputRef[] {
	const handler: ProxyHandler<OutputRef[]> = {
		get(_target, prop: string | symbol) {
			if (typeof prop === "symbol") return undefined;

			// Numeric index: voices[0] → ChainableOutputRef with voice=0
			if (!Number.isNaN(Number(prop))) {
				const voice = Number(prop);
				const outputRef: OutputRef = { ref: nodeId, out: defaultOutput, voice };
				return wrapOutputRef(outputRef);
			}

			// Array-like length (unknown at API time)
			if (prop === "length") {
				return undefined;
			}

			return undefined;
		},
	};

	return new Proxy([] as OutputRef[], handler);
}

// Initialize the circular dependency bridge (must be after wrap is defined)
setWrapFn(wrap);
