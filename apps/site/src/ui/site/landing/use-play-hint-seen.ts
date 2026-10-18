/**
 * Whether the visitor has ever pressed play on the landing page. Turns true
 * on the first play and stays true across visits (browser storage).
 */

import { useEffect, useState } from "react";

const KEY = "auxlang.playHintSeen";

export function usePlayHintSeen(playing: boolean): boolean {
	const [seen, setSeen] = useState(readSeen);

	useEffect(() => {
		if (!playing || seen) return;
		setSeen(true);
		writeSeen();
	}, [playing, seen]);

	return seen;
}

function readSeen(): boolean {
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return false;
	}
}

function writeSeen(): void {
	try {
		localStorage.setItem(KEY, "1");
	} catch {
		// Storage blocked: the hint returns next visit, which is harmless.
	}
}
