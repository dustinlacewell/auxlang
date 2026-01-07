import { resetIdCounter } from "../descriptor/identity";
import { clearRegistry } from "../descriptor/registry";
import type { Graph } from "../graph/types";
import { compile } from "../runtime/compile";
import type { WorkletMessage } from "../runtime/types";

// For AudioWorklets, we need the raw module URL
// Vite will serve this file directly during dev
const processorUrl = new URL("../runtime/processor.ts", import.meta.url).href;

// Import all API functions
import * as api from "./api";

let audioContext: AudioContext | null = null;
let workletNode: AudioWorkletNode | null = null;

async function startAudio(): Promise<void> {
	if (audioContext) return;

	console.log("Starting audio, loading worklet from:", processorUrl);
	audioContext = new AudioContext();
	await audioContext.audioWorklet.addModule(processorUrl);
	console.log("Worklet loaded");

	workletNode = new AudioWorkletNode(audioContext, "graph-processor");
	workletNode.connect(audioContext.destination);
	console.log("Worklet connected");
}

function stopAudio(): void {
	if (workletNode) {
		const message: WorkletMessage = { type: "stop" };
		workletNode.port.postMessage(message);
	}
}

function sendGraph(graph: Graph): void {
	if (!workletNode) return;

	const compiled = compile(graph);
	const message: WorkletMessage = { type: "setGraph", graph: compiled };
	workletNode.port.postMessage(message);
}

function showError(message: string): void {
	const errorEl = document.getElementById("error");
	if (errorEl) {
		errorEl.textContent = message;
		errorEl.classList.add("visible");
	}
}

function clearError(): void {
	const errorEl = document.getElementById("error");
	if (errorEl) {
		errorEl.textContent = "";
		errorEl.classList.remove("visible");
	}
}

function runCode(code: string): void {
	clearError();

	// Reset descriptor state before each run
	resetIdCounter();
	clearRegistry();

	try {
		// Wrap code to return the last expression if no explicit return
		const wrappedCode = code.includes("return") ? code : `return (${code})`;

		// Create a function that has access to our API
		const fn = new Function(...Object.keys(api), wrappedCode);
		console.log("Executing code with API:", Object.keys(api));

		// Call it with our API values
		const result = fn(...Object.values(api));
		console.log("Code result:", result);

		// If the result is a Graph, send it to the worklet
		if (result && typeof result === "object" && "nodes" in result) {
			console.log("Sending graph to worklet:", result);
			sendGraph(result as Graph);
		} else {
			console.log("Result is not a graph");
		}
	} catch (err) {
		console.error("Code error:", err);
		showError(String(err));
	}
}

// Wire up UI
document.getElementById("run")?.addEventListener("click", async () => {
	const editor = document.getElementById("editor") as HTMLTextAreaElement;
	await startAudio();
	runCode(editor.value);
});

document.getElementById("stop")?.addEventListener("click", () => {
	stopAudio();
});

// Keyboard shortcut: Ctrl/Cmd+Enter to run
document.getElementById("editor")?.addEventListener("keydown", async (e) => {
	if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
		e.preventDefault();
		const editor = e.target as HTMLTextAreaElement;
		await startAudio();
		runCode(editor.value);
	}
});
