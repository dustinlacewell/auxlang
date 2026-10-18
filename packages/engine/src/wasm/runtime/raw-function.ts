/** A runtime function written directly as WebAssembly. */
export interface RawFunction {
	readonly params: readonly number[];
	readonly result: number;
	readonly locals: readonly number[];
	readonly body: readonly number[];
}
