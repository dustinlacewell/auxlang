/**
 * Chapter: open port groups — sigs()/group() — as a mixer uses them.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function PortGroupsChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Port groups">
			<P>
				<C>group(sig(0), { "{ open: true }" })</C> makes an open input: a patch can plug in as
				many signals as it wants, and the tick sees them as an array. <C>{"{ like: 'ch' }"}</C>{" "}
				gives a second group one slot per member of the first, so <C>level</C> below always has
				one entry per channel in <C>ch</C>.
			</P>
			{ex("portGroups")}
		</Section>
	);
}
