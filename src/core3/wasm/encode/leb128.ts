/** LEB128, the variable-length integers of the WebAssembly binary format. */

/** An unsigned 32-bit integer. */
export function unsignedLeb(value: number, out: number[]): void {
	let n = value >>> 0;
	do {
		let byte = n & 0x7f;
		n >>>= 7;
		if (n !== 0) byte |= 0x80;
		out.push(byte);
	} while (n !== 0);
}

/** A signed 32-bit integer. */
export function signedLeb(value: number, out: number[]): void {
	let n = value | 0;
	for (;;) {
		const byte = n & 0x7f;
		n >>= 7;
		const done = (n === 0 && (byte & 0x40) === 0) || (n === -1 && (byte & 0x40) !== 0);
		out.push(done ? byte : byte | 0x80);
		if (done) return;
	}
}
