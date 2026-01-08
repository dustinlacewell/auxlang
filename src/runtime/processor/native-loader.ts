/**
 * Native WASM module loader for the AudioWorklet context.
 *
 * Loads the AssemblyScript-compiled WASM and exposes its exports
 * as globals that device process functions can call.
 */

// WASM module instance - set after loading
let wasmExports: NativeExports | null = null;

/**
 * Exports from the native WASM module.
 */
export interface NativeExports {
	// Memory
	memory: WebAssembly.Memory;

	// Reverb functions
	initReverb(sampleRate: number): void;
	setReverbRoomSize(value: number): void;
	setReverbDamping(value: number): void;
	setReverbWet(value: number): void;
	setReverbDry(value: number): void;
	setReverbWidth(value: number): void;
	processReverbMono(input: number): number;
	clearReverb(): void;

	// Batch processing
	allocateBuffers(size: number): number;
	getOutputBuffer(): number;
	processReverbBatch(count: number): void;

	// AssemblyScript runtime exports
	__new(size: number, id: number): number;
	__pin(ptr: number): number;
	__unpin(ptr: number): void;
	__collect(): void;
}

/**
 * Load the native WASM module from a URL.
 * Should be called once during worklet initialization.
 */
export async function loadNativeModule(wasmUrl: string): Promise<void> {
	try {
		const response = await fetch(wasmUrl);
		const wasmBytes = await response.arrayBuffer();

		const wasmModule = await WebAssembly.instantiate(wasmBytes, {
			env: {
				abort: (msg: number, file: number, line: number, col: number) => {
					console.error(`WASM abort at ${file}:${line}:${col}`);
				},
			},
		});

		wasmExports = wasmModule.instance.exports as unknown as NativeExports;

		// Make reverb functions available globally for device process functions
		(globalThis as Record<string, unknown>).__nativeReverb = {
			init: wasmExports.initReverb.bind(wasmExports),
			setRoom: wasmExports.setReverbRoomSize.bind(wasmExports),
			setDamp: wasmExports.setReverbDamping.bind(wasmExports),
			setWet: wasmExports.setReverbWet.bind(wasmExports),
			setDry: wasmExports.setReverbDry.bind(wasmExports),
			process: wasmExports.processReverbMono.bind(wasmExports),
			clear: wasmExports.clearReverb.bind(wasmExports),
		};

		console.log("Native WASM module loaded successfully");
	} catch (err) {
		console.warn("Failed to load native WASM module, using JS fallback:", err);
		// Set a marker so devices know WASM isn't available
		(globalThis as Record<string, unknown>).__nativeReverb = null;
	}
}

/**
 * Check if native reverb is available.
 */
export function hasNativeReverb(): boolean {
	return wasmExports !== null;
}

/**
 * Get the native module exports (for advanced usage).
 */
export function getNativeExports(): NativeExports | null {
	return wasmExports;
}
