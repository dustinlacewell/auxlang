/**
 * Convert core2 StereoRuntimeGraph to WorkletStereoGraph format.
 */

import type { StereoRuntimeGraph } from "./compile";
import { getDeviceSpec } from "../device/registry";
import type { WorkletConfig, WorkletInput, WorkletNode, WorkletSpec, WorkletStereoGraph } from "./worklet-types";

/** Cache of fetched WASM modules by URL */
const wasmCache = new Map<string, ArrayBuffer>();

/**
 * Convert a StereoRuntimeGraph to WorkletStereoGraph format.
 * Fetches any WASM modules referenced by devices.
 */
export async function toWorkletStereoGraph(runtime: StereoRuntimeGraph): Promise<WorkletStereoGraph> {
	// Collect unique device specs and WASM URLs
	const specs: Record<string, WorkletSpec> = {};
	const wasmUrls = new Set<string>();

	for (const node of runtime.nodes) {
		const spec = getDeviceSpec(node.device);
		if (!spec) {
			throw new Error(`Unknown device: ${node.device}`);
		}

		if (!specs[node.device]) {
			// Serialize spec
			const inputDefaults: Record<string, { default: number }> = {};
			for (const [name, def] of Object.entries(spec.inputs)) {
				// After expansion, defaults should be scalar
				const defaultVal = Array.isArray(def.default) ? def.default[0] ?? 0 : def.default;
				inputDefaults[name] = { default: defaultVal };
			}

			const processSource = spec.process.toString();
			specs[node.device] = {
				inputs: inputDefaults,
				outputs: [...spec.outputs],
				defaultInput: spec.defaultInput,
				defaultOutput: spec.defaultOutput,
				processSource,
			};
		}

		if (spec.wasmUrl) {
			wasmUrls.add(spec.wasmUrl);
		}
	}

	// Fetch any WASM URLs not already cached
	const fetchPromises: Promise<void>[] = [];
	for (const url of wasmUrls) {
		if (!wasmCache.has(url)) {
			fetchPromises.push(
				fetch(url)
					.then((res) => {
						if (!res.ok) throw new Error(`Failed to fetch WASM: ${url}`);
						return res.arrayBuffer();
					})
					.then((bytes) => {
						wasmCache.set(url, bytes);
					}),
			);
		}
	}
	await Promise.all(fetchPromises);

	// Convert nodes
	const nodes: WorkletNode[] = runtime.nodes.map((node) => {
		const spec = getDeviceSpec(node.device)!;
		const inputs: Record<string, WorkletInput> = {};

		for (const [name, source] of Object.entries(node.inputSources)) {
			if (source.type === "constant") {
				inputs[name] = { type: "constant", value: source.value };
			} else if (source.type === "connection") {
				inputs[name] = { type: "connection", nodeId: source.nodeId, output: source.output };
			} else if (source.type === "lambda") {
				inputs[name] = { type: "lambda", source: source.fn.toString() };
			}
		}

		// Serialize config
		const config: Record<string, WorkletConfig> = {};
		for (const [name, value] of Object.entries(node.config)) {
			if (typeof value === "function") {
				config[name] = { type: "fn", source: value.toString() };
			} else {
				config[name] = { type: "data", value };
			}
		}

		const workletNode: WorkletNode = {
			id: node.id,
			device: node.device,
			inputs,
			config,
		};

		// Include WASM bytes if this device uses WASM
		if (spec.wasmUrl) {
			const wasmBytes = wasmCache.get(spec.wasmUrl);
			if (wasmBytes) {
				return { ...workletNode, wasmBytes };
			}
		}

		return workletNode;
	});

	return {
		specs,
		nodes,
		leftOutputIds: [...runtime.leftOutputIds],
		rightOutputIds: [...runtime.rightOutputIds],
	};
}
