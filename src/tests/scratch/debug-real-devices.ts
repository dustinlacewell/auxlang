/**
 * Run actual device process functions and trace output
 */

import * as api from "../../core2/api";
import { collect } from "../../core2/eval/collect";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { expandPoly } from "../../core2/graph/expand-poly";
import { compile } from "../../core2/runtime/compile";
import { getDeviceSpec } from "../../core2/device/registry";

reset();

const code = `
clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.sin().gain(s.gate.adsr()).delay({ feedback: 0.1, time: 0.23 }).out()
)
`;

runCode(code, api);
const graph = collect();
const expanded = expandPoly(graph);
const compiled = compile(expanded);

const sampleRate = 48000;

// Build runtime state for each node
interface NodeRuntime {
	id: string;
	device: string;
	process: Function;
	inputs: Record<string, { type: string; value?: number; nodeId?: string; output?: string }>;
	state: Record<string, unknown>;
	outputs: Record<string, number>;
}

const nodes: NodeRuntime[] = [];
const nodeMap = new Map<string, NodeRuntime>();

for (const node of compiled.nodes) {
	const spec = getDeviceSpec(node.device);
	if (!spec) throw new Error(`Unknown device: ${node.device}`);

	const inputs: Record<string, any> = {};
	for (const [name, source] of Object.entries(node.inputSources)) {
		inputs[name] = source;
	}

	const runtime: NodeRuntime = {
		id: node.id,
		device: node.device,
		process: spec.process,
		inputs,
		state: {},
		outputs: {},
	};

	// Initialize outputs
	for (const out of spec.outputs) {
		runtime.outputs[out] = 0;
	}

	nodes.push(runtime);
	nodeMap.set(node.id, runtime);
}

// Process samples
const totalSamples = 4 * sampleRate;
const outputs: number[] = [];

for (let i = 0; i < totalSamples; i++) {
	for (const node of nodes) {
		// Resolve inputs
		const resolvedInputs: Record<string, number> = {};
		for (const [name, source] of Object.entries(node.inputs)) {
			if (source.type === "constant") {
				resolvedInputs[name] = source.value ?? 0;
			} else if (source.type === "connection") {
				resolvedInputs[name] = nodeMap.get(source.nodeId)?.outputs[source.output] ?? 0;
			}
		}

		// Get config from spec
		const spec = getDeviceSpec(node.device)!;
		const config = { ...spec.config };

		// Process
		const result = node.process(resolvedInputs, config, node.state, sampleRate);
		Object.assign(node.outputs, result);
	}

	// Get final output (delay)
	const delayNode = nodeMap.get("delay6")!;
	outputs.push(delayNode.outputs.audio ?? 0);
}

// Analyze - look for the high frequency content
console.log("=== Output Analysis ===\n");

// RMS per 250ms
console.log("RMS per 250ms:");
const windowSamples = Math.floor(0.25 * sampleRate);
for (let w = 0; w < 16; w++) {
	const start = w * windowSamples;
	const end = Math.min(start + windowSamples, outputs.length);
	if (start >= outputs.length) break;

	let sum = 0;
	let peak = 0;
	for (let i = start; i < end; i++) {
		sum += outputs[i] * outputs[i];
		peak = Math.max(peak, Math.abs(outputs[i]));
	}
	const rms = Math.sqrt(sum / (end - start));
	console.log(`  ${(w * 250).toString().padStart(4)}ms: RMS=${rms.toFixed(6)}, peak=${peak.toFixed(6)}`);
}

// Check for high frequency content in last second (should be silent)
console.log("\nLast second (should be ~silent):");
const lastSecond = outputs.slice(-sampleRate);
let lastSum = 0;
let lastPeak = 0;
for (const v of lastSecond) {
	lastSum += v * v;
	lastPeak = Math.max(lastPeak, Math.abs(v));
}
console.log(`  RMS=${Math.sqrt(lastSum / lastSecond.length).toExponential(4)}`);
console.log(`  Peak=${lastPeak.toExponential(4)}`);

// Check delay buffer state
const delayState = nodeMap.get("delay6")!.state;
console.log("\nDelay buffer state:");
console.log(`  writeIndex: ${delayState.writeIndex}`);
if (delayState.buffer) {
	const buf = delayState.buffer as Float32Array;
	let bufSum = 0;
	let bufPeak = 0;
	let nonZero = 0;
	for (let i = 0; i < buf.length; i++) {
		bufSum += buf[i] * buf[i];
		bufPeak = Math.max(bufPeak, Math.abs(buf[i]));
		if (buf[i] !== 0) nonZero++;
	}
	console.log(`  Buffer RMS: ${Math.sqrt(bufSum / buf.length).toExponential(4)}`);
	console.log(`  Buffer peak: ${bufPeak.toExponential(4)}`);
	console.log(`  Non-zero samples: ${nonZero}`);
}
