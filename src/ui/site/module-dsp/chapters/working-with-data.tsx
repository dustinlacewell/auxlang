/**
 * Chapter: loops, destructuring, array methods, optional chaining, etc. —
 * shown inside a realistic small voice bank, not as a syntax list.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function WorkingWithDataChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Working with data">
			<P>
				The tick is ordinary JavaScript over the memory setup built: <C>for…of</C> walks an
				array, destructuring reads a field or an index, <C>?.</C> reads safely through a path
				that might be missing, <C>??</C> falls back when an array read lands out of range. Array
				methods that work in place — <C>fill</C>, <C>set</C>, <C>copyWithin</C>, <C>forEach</C> —
				run without allocating a new array.
			</P>
			<P>
				<C>bank</C> below holds three voices as an array of records, built once in setup, and
				sums them each sample with a plain <C>for…of</C>:
			</P>
			{ex("workingWithData")}
		</Section>
	);
}
