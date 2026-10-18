/**
 * Tracks which of the given section ids is current as the page scrolls, for
 * a sidebar to highlight. Picks the one nearest the top of the viewport
 * among those already scrolled past; falls back to the first section.
 */

import { useEffect, useState } from "react";

/** `sections` is never empty; callers check before calling. */
function pickActive(sections: readonly HTMLElement[]): string {
	const passed = sections.filter((el) => el.getBoundingClientRect().top <= 80);
	const current = passed.at(-1) ?? sections[0];
	// biome-ignore lint/style/noNonNullAssertion: sections is non-empty by the caller's guard.
	return current!.id;
}

export function useActiveSection(ids: readonly string[]): string | null {
	const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

	useEffect(() => {
		const sections = ids
			.map((id) => document.getElementById(id))
			.filter((el): el is HTMLElement => el !== null);
		if (sections.length === 0) return;

		const onScroll = () => setActiveId(pickActive(sections));
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [ids]);

	return activeId;
}
