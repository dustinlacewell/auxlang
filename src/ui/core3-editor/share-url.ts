/**
 * Share-link encoding for the editor: the patch source travels in the URL
 * fragment as base64url-encoded UTF-8 (`#code=...`). The fragment never
 * reaches a server, so links stay clean in logs and survive any length a
 * patch will realistically hit.
 */

const PARAM = "code=";

function toBase64Url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
	const b64 = text.replaceAll("-", "+").replaceAll("_", "/");
	return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** The full shareable URL for a patch, anchored at the current page. */
export function shareUrlFor(code: string): string {
	const encoded = toBase64Url(new TextEncoder().encode(code));
	return `${window.location.origin}${window.location.pathname}#${PARAM}${encoded}`;
}

/** The patch encoded in the current URL's fragment; null when absent or malformed. */
export function codeFromUrl(): string | null {
	const hash = window.location.hash.slice(1);
	if (!hash.startsWith(PARAM)) return null;
	try {
		return new TextDecoder().decode(fromBase64Url(hash.slice(PARAM.length)));
	} catch {
		return null;
	}
}
