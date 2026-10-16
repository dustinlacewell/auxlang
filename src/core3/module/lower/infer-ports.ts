/**
 * A tick's inputs, read from its first destructured param: each property is
 * one port, named by the key; its value is the local binding the tick body
 * reads, and its default (via `port-markers`) gives the port's unit and
 * default. No param (or an empty pattern) means no inputs.
 */

import type { ArrowFunctionExpression, ObjectPattern } from "acorn";
import type { PortAnn } from "../../types";
import { markerAnn } from "./port-markers";

export interface InferredPorts {
	readonly ins: Record<string, PortAnn>;
	readonly order: readonly string[];
	/** Port name -> the tick's local binding name for it. */
	readonly bindings: ReadonlyMap<string, string>;
}

export function inferPorts(tick: ArrowFunctionExpression, moduleName: string): InferredPorts {
	const what = `module '${moduleName}'`;
	if (tick.params.length === 0) return { ins: {}, order: [], bindings: new Map() };
	const first = tick.params[0];
	if (first?.type !== "ObjectPattern") {
		throw new Error(`${what}: the tick's first param must be destructured, e.g. ({ in: x = 0 }) => ...`);
	}
	const pattern = first as ObjectPattern;

	const ins: Record<string, PortAnn> = {};
	const order: string[] = [];
	const bindings = new Map<string, string>();
	const portNames = new Set<string>();

	for (const prop of pattern.properties) {
		if (prop.type === "RestElement") {
			throw new Error(`${what}: the tick's input pattern may not use a rest element`);
		}
		if (prop.type !== "Property" || prop.key.type !== "Identifier") {
			throw new Error(`${what}: the tick's input pattern must destructure plain port names`);
		}
		portNames.add(prop.key.name);
	}

	for (const prop of pattern.properties) {
		if (prop.type !== "Property" || prop.key.type !== "Identifier") continue;
		const portName = prop.key.name;
		const value = prop.value;

		let local: string;
		let defaultNode: Parameters<typeof markerAnn>[0] = null;
		if (value.type === "Identifier") {
			local = value.name;
		} else if (value.type === "AssignmentPattern" && value.left.type === "Identifier") {
			local = value.left.name;
			defaultNode = value.right;
		} else {
			throw new Error(`${what}: input '${portName}' must destructure to a plain local name`);
		}

		if (
			defaultNode !== null &&
			defaultNode.type === "CallExpression" &&
			defaultNode.callee.type === "Identifier" &&
			portNames.has(defaultNode.callee.name)
		) {
			throw new Error(
				`${what}: input '${portName}' defaults with a call to '${defaultNode.callee.name}', ` +
					`which is also a port name in this pattern; rename the port binding, e.g. ` +
					`'${defaultNode.callee.name}: ${defaultNode.callee.name}0'`,
			);
		}

		ins[portName] = markerAnn(defaultNode, `${what}, input '${portName}'`);
		order.push(portName);
		bindings.set(portName, local);
	}

	return { ins, order, bindings };
}
