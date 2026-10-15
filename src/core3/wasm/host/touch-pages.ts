/**
 * Make the OS map an instance's memory ahead, a range at a time (a build
 * step each): write a zero into every OS page of WASM pages
 * [from, from + count). Fresh memory is zero, so no value changes. Else the
 * first write to each OS page faults inside a later step, the swap's copies
 * or `render` (swap-block-parts.ts, coastline: the swap's first carry took
 * 490 µs against 70 µs on mapped memory).
 */

import { PAGE } from "../program/memory-layout";

/** The OS page size the touch assumes (4 KB where audio runs; a larger page is touched more than once). */
const OS_PAGE = 4096;

export function touchPages(memory: WebAssembly.Memory, from: number, count: number): void {
	const bytes = new Uint8Array(memory.buffer, from * PAGE, count * PAGE);
	for (let at = 0; at < bytes.length; at += OS_PAGE) bytes[at] = 0;
}
