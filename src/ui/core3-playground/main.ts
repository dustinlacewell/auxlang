/**
 * Playground page controller (vanilla — no framework). Wires the textarea and
 * two buttons to the eval→compile→play path. Run swaps the live program while
 * playing (the worklet crossfades); Stop silences it. Compile/eval errors are
 * shown verbatim in the error strip — the language's loud errors are the point.
 */

import { play, stop } from "@/core3/runtime/audio";
import { DEMO_PATCH } from "./demo";
import { evalPatch } from "./eval-patch";

const code = document.querySelector<HTMLTextAreaElement>("#code");
const runBtn = document.querySelector<HTMLButtonElement>("#run");
const stopBtn = document.querySelector<HTMLButtonElement>("#stop");
const errStrip = document.querySelector<HTMLDivElement>("#error");

if (!code || !runBtn || !stopBtn || !errStrip) {
	throw new Error("core3-playground: page markup is missing an expected element");
}

code.value = DEMO_PATCH;

function showError(message: string): void {
	errStrip.textContent = message;
	errStrip.style.visibility = "visible";
}

function clearError(): void {
	errStrip.textContent = "";
	errStrip.style.visibility = "hidden";
}

async function run(): Promise<void> {
	clearError();
	try {
		const program = evalPatch(code.value);
		await play(program);
	} catch (err) {
		showError(err instanceof Error ? err.message : String(err));
	}
}

runBtn.addEventListener("click", () => void run());
stopBtn.addEventListener("click", () => stop());
code.addEventListener("keydown", (e) => {
	if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
		e.preventDefault();
		void run();
	}
});

clearError();
