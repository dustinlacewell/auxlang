/**
 * WASM state serialization/deserialization.
 *
 * WASM devices that support state preservation must export:
 * - get_state_size(): number
 * - alloc_state_buffer(size: number): ptr
 * - serialize_state(): number (bytes written)
 * - deserialize_state(): void
 * - memory: WebAssembly.Memory
 */

export async function instantiateWasm(wasmBytes: ArrayBuffer): Promise<WebAssembly.Instance> {
	const wasmModule = await WebAssembly.instantiate(wasmBytes, {
		env: { abort: () => console.error("WASM abort called") },
	});
	return wasmModule.instance;
}

export function initWasm(instance: WebAssembly.Instance, sampleRate: number): void {
	const exports = instance.exports as Record<string, unknown>;
	const init = exports.init as ((sr: number) => void) | undefined;
	if (init) init(sampleRate);
}

export function serializeWasmState(instance: WebAssembly.Instance): Float32Array | null {
	const exports = instance.exports as Record<string, unknown>;
	const getStateSize = exports.get_state_size as (() => number) | undefined;
	const allocStateBuffer = exports.alloc_state_buffer as ((size: number) => number) | undefined;
	const serializeState = exports.serialize_state as (() => number) | undefined;
	const memory = exports.memory as WebAssembly.Memory | undefined;

	if (!getStateSize || !allocStateBuffer || !serializeState || !memory) return null;

	const size = getStateSize();
	if (size <= 0) return null;

	const ptr = allocStateBuffer(size);
	const written = serializeState();
	if (written <= 0) return null;

	const wasmBuffer = new Float32Array(memory.buffer, ptr, written);
	return new Float32Array(wasmBuffer);
}

export function deserializeWasmState(instance: WebAssembly.Instance, state: Float32Array): void {
	const exports = instance.exports as Record<string, unknown>;
	const allocStateBuffer = exports.alloc_state_buffer as ((size: number) => number) | undefined;
	const deserializeState = exports.deserialize_state as (() => void) | undefined;
	const memory = exports.memory as WebAssembly.Memory | undefined;

	if (!allocStateBuffer || !deserializeState || !memory) return;

	const ptr = allocStateBuffer(state.length);
	const wasmBuffer = new Float32Array(memory.buffer, ptr, state.length);
	wasmBuffer.set(state);
	deserializeState();
}
