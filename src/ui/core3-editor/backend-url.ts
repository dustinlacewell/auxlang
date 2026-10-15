/**
 * The engine backend the editor plays on, from the page URL's query:
 * `?backend=wasm` or `?backend=js`. Absent or unknown: null (the audio
 * host's default). The query, not the fragment, which carries the patch
 * (share-url.ts).
 */

import type { Backend } from "@/core3/runtime/prepare/host-options";

export function backendFromUrl(): Backend | null {
	const value = new URLSearchParams(window.location.search).get("backend");
	return value === "wasm" || value === "js" ? value : null;
}
