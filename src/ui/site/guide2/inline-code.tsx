/**
 * Splits brick text on `backtick` spans and renders the code spans with `C`
 * from the prose primitives, so a bare registered module name upgrades to
 * the live ModuleName just like the rest of the site's prose.
 */

import { C } from "@/ui/site/prose";

export function inlineCode(text: string): React.ReactNode[] {
	const parts = text.split("`");
	return parts.map((part, i) =>
		i % 2 === 1 ? <C key={i}>{part}</C> : <span key={i}>{part}</span>,
	);
}
