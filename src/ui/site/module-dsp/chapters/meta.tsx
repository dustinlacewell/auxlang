/**
 * Chapter: meta — doc, cat, args, reduce/width, reads, outs.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function MetaChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Meta">
			<P>
				<C>defmod</C>'s second argument holds what the code itself does not say. <C>doc</C> is the
				one-line description the modules page shows. <C>cat</C> groups it there. <C>args</C> lists
				its inputs in positional order, so a caller can set them without names:{" "}
				<C>wavefold(0.7)</C> sets <C>amount</C> because <C>args</C> names it.
			</P>
			<P>
				A reducer sets <C>reduce: true</C> — its tick sees every lane of its input as one array,
				the way <C>spread</C> and <C>mixer</C> do, instead of running once per lane.
			</P>
			{ex("meta")}
		</Section>
	);
}
