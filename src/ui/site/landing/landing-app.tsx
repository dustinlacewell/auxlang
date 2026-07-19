/**
 * The front page: what auxlang is, the hello patch (runnable), and where to go
 * next. Narrow prose column, no card chrome — the quietest page on the site.
 */

import { TextLink } from "@/ui/design/text-link";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { RunBlock } from "@/ui/site/run-block";
import { SitePage } from "@/ui/site/site-page";

const HELLO_PATCH = `clock(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .lpf({ cutoff: 900, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()`;

const NEXT_STEPS = [
	{ href: "/editor.html", label: "editor", blurb: "edit a patch while it plays" },
	{ href: "/guide.html", label: "guide", blurb: "how to write patches" },
	{ href: "/patterns.html", label: "patterns", blurb: "every notation form and combinator" },
	{
		href: "/modules.html",
		label: "modules",
		blurb: "oscillators, filters, envelopes, effects, drums",
	},
] as const;

export function LandingApp() {
	const audio = useSharedAudio();

	return (
		<SitePage current="home" narrow onStopAll={audio.halt}>
			<div className="pt-8">
				<h1 className="flex items-center gap-3 font-mono text-4xl font-bold mb-2">
						<img src="/logo.svg" alt="" className="h-11 w-11" />
						auxlang
					</h1>
				<p className="text-lg text-gray-300 mb-6">Patterns and signals, one patch.</p>

				<p className="text-gray-400 mb-8 leading-relaxed">
					A language for making music in the browser, embedded in JavaScript. Write Tidal-style
					patterns. Patch modular-style signals. Each side plugs into the other: a pattern can turn
					any knob, and a sequencer is just a module with pitch, gate, and trig outputs.
				</p>

				<RunBlock id="landing::hello" code={HELLO_PATCH} audio={audio} />

				<ul className="mt-10 space-y-2">
					{NEXT_STEPS.map((step) => (
						<li key={step.label} className="text-sm">
							<TextLink href={step.href} className="font-mono">
								{step.label}
							</TextLink>
							<span className="text-gray-400"> — {step.blurb}</span>
						</li>
					))}
				</ul>
			</div>
		</SitePage>
	);
}
