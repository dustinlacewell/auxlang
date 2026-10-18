/** An index a typed array holds an element at: anything else reads `undefined` and writes nothing. */
export function validIndex(index: number, length: number): boolean {
	return Number.isInteger(index) && index >= 0 && index < length;
}
