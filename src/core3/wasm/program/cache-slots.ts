/** One past the highest math cache slot (`__mc[slot]`) in `texts`: the cache size they need. */
export function cacheSlotsIn(texts: readonly string[]): number {
	let slots = 0;
	for (const text of texts)
		for (const m of text.matchAll(/__mc\[(\d+)\]/g)) slots = Math.max(slots, Number(m[1]) + 1);
	return slots;
}
