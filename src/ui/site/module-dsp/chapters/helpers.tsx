/**
 * Chapter: same-file helper functions and nested arrows inside the tick.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function HelpersChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Helpers">
			<P>
				A plain function written alongside a module, at the top level of the file, is a helper:
				the tick calls it like any function. <C>wrapIndex</C> below wraps a write head into a
				ring buffer; the tick reads cleaner for it.
			</P>
			<P>
				A small arrow written inside the tick reads the tick's own locals and parameters — handy
				for a one-line lookup you only need in one place.
			</P>
			{ex("helpers")}
		</Section>
	);
}
