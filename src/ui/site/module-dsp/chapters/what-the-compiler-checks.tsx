/**
 * Chapter: writing to satisfy the compiler — phrased as what to do.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function WhatTheCompilerChecksChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="What the compiler checks">
			<P>
				Build every buffer and record in setup; the tick only reads and writes what is already
				there, so it never allocates. Keep each local's shape fixed — a number stays a number, an
				array keeps its length. Write your own functions without recursion, so every call
				resolves in bounded time.
			</P>
			<P>
				Both engines — the plain interpreter and the WASM backend — run this code to the same bit,
				every sample. A line that cannot run the same on both is a loud error naming the line, at
				eval time, before a single sample plays.
			</P>
			{ex("whatCompilerChecks")}
		</Section>
	);
}
