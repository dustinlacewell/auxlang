/**
 * Module code: the rules a defmod's tick, state and helpers follow where they
 * differ from plain JavaScript. One table per topic; each row is a form and
 * what happens to it. Rules here mirror `src/core3/module/front/rules/` and
 * the agreement table in `src/tests/core3/wasm/tick-agreement.test.ts`.
 */

import { TextLink } from "@/ui/design/text-link";
import { C, P, Section } from "@/ui/site/prose";
import { SitePage } from "@/ui/site/site-page";
import { RULES, SKELETON } from "./rules";

function RuleTable({ rows }: { rows: readonly (readonly [string, string])[] }) {
	return (
		<table className="text-sm mb-4 w-full">
			<tbody>
				{rows.map(([form, rule]) => (
					<tr key={form} className="border-t border-surface-700 align-top">
						<td className="py-1 pr-6 font-mono text-gray-200 whitespace-pre">{form}</td>
						<td className="py-1 text-gray-400">{rule}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export function ModuleCodeApp() {
	return (
		<SitePage current="module code" narrow>
			<h1 className="text-xl font-bold mb-1">Module code</h1>
			<p className="text-sm text-gray-400 mb-8">
				Where a defmod's code differs from plain JavaScript.
			</p>

			<Section title="The shape">
				<P>
					<C>state(sr)</C> runs once and builds the module's memory. <C>tick</C> runs once per
					sample, per lane. Its parameters are <C>s</C> (state), <C>i</C> (inputs), <C>o</C>{" "}
					(outputs), <C>cfg</C> (config) and <C>sr</C> (sample rate). Functions the tick calls go in{" "}
					<C>helpers</C>.
				</P>
				<pre className="font-mono text-sm text-gray-200 bg-surface-800 rounded p-3 mb-3 overflow-x-auto">
					{SKELETON}
				</pre>
				<P>
					The tick is plain JavaScript that runs without allocating and without types that change at
					run time. The plain-JS engine and the WASM engine run it the same, to the last bit. Code
					they could not run the same is an error that names the problem.
				</P>
			</Section>

			{RULES.map((topic) => (
				<Section key={topic.title} title={topic.title}>
					{topic.note && <P>{topic.note}</P>}
					<RuleTable rows={topic.rows} />
				</Section>
			))}

			<P>
				The guide shows a defmod in a full patch:{" "}
				<TextLink href="/guide.html">custom modules</TextLink>.
			</P>
		</SitePage>
	);
}
