/**
 * The front page: what auxlang is, the hello patch (runnable), and where to go
 * next. Narrow prose column, no card chrome — the quietest page on the site.
 */

import { TextLink } from "@/ui/design/text-link";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { P } from "@/ui/site/prose";
import { RunBlock } from "@/ui/site/run-block";
import { SitePage } from "@/ui/site/site-page";

const HELLO_PATCH = `tempo(126)

// kick (switch it off for a breakdown), and a sidechain pump the chords and bass duck under
const beat = seq("60*4").trig.mul(toggle(1))
beat.kick({ pitch: 41, sweep: 4, decay: 0.4, click: 0.1 }).gain(0.9).out()
const pump = beat.ad(0.002, 0.3).sub(1)

// clap in a room, open hat on the offbeat, hold the button for a snare roll
seq(p\`~ 60\`.fast(2)).trig.clap({ decay: 0.25 }).reverb({ room: 0.7, mix: 0.25 }).gain(0.6).out()
seq(p\`60*4\`.late(1 / 8)).trig.hihat({ decay: 0.08, metal: 0.3 }).gain(0.6).pan(0.25).out()
seq("60*16").trig.mul(button()).snare({ decay: 0.08 }).gain(0.4).out()

// ticks: swung 16ths, the offbeat loudest and a little open
const hat = seq(p\`60*16\`
  .with({ vel: p\`0.3 0.5 1 0.5\`.fast(4) })
  .swing(8))
hat.trig
  .hihat({ decay: p\`0.02 0.02 0.06 0.02\`.fast(4) })
  .mul(hat.vel)
  .gain(0.6)
  .pan(-0.25)
  .out()

// chords: Fm Db Ab Eb, two detuned saws a note; the pad sweeps the filter
const filter = xy(0.6, 0.2)
const chords = seq("<[f3,ab3,c4,eb4] [db3,f3,ab3,c4] [ab2,c3,eb3,g3] [eb3,g3,bb3,db4]>")
const stack = chords.add(p\`[-0.1, 0.1]\`)
  .saw()
  .lpf(filter.x.scale(0, 1, 70, 110), filter.y.scale(0, 1, 0, 0.7))
  .mul(chords.gate.adsr(0.01, 0.3, 0.8, 0.3))
  .mul(pump)
  .gain(0.05)
stack.spread().out()

// lead: a syncopated hook on the chord tones, plucked, echoing a dotted eighth
const hook = seq(p\`<[c5 ~ ab4 c5 ~ f5 ~ eb5] [c5 ~ ab4 c5 ~ f5 ~ db5]
  [c5 ~ ab4 c5 ~ eb5 ~ c5] [bb4 ~ g4 bb4 ~ eb5 ~ db5]>\`)
const lead = hook.sqr()
  .lpf(hz(hook.gate.ad(0.002, 0.2).mul(3000).add(600)), 0.3)
  .mul(hook.gate.adsr(0.002, 0.2, 0.3, 0.1))
  .delay({ time: beats(0.75), feedback: 0.4, mix: 0.3 })
  .gain(0.08)
lead.out()

// one shared reverb for the chords and the lead
stack.mix().add(lead).reverb({ room: 0.85, damp: 0.5, mix: 1 }).gain(0.4).out()

// bass: the root on the offbeats, the filter opening on each note as far as the slider says
const root = seq("<f1 db1 ab0 eb1>")
const pluck = seq(p\`60*4\`.late(1 / 8)).gate
root.saw()
  .lpf(hz(pluck.ad(0.002, 0.15).mul(slider(1800, 200, 5000)).add(150)), 0.5)
  .mul(pluck.adsr(0.002, 0.15, 0.6, 0.05))
  .mul(pump)
  .gain(0.35)
  .scope(0.05)
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
	{ href: "/module-dsp.html", label: "module dsp", blurb: "write your own modules" },
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
				<p className="text-lg text-gray-300 mb-6">Text-based modular synthesis.</p>

				<RunBlock id="landing::hello" code={HELLO_PATCH} audio={audio} />

				<div style={{
					color: "#aaa",
					textAlign: "right",
					width: "100%",
					fontSize: ".6em"
				}}>
					Hold <code>ctrl</code> over module names for more info.
				</div>

				<div className="mt-10">
					<P>
						Auxlang is music programming in the spirit of Eurorack-style modular synthesis,
						letting you connect oscillators, filters, envelopes, sequencers, and effects by
						chaining method calls together.
					</P>
					<P>
						Patches written in plain JavaScript are compiled to WebAssembly, resulting in speeds up
						to ~80x faster than realtime.
					</P>
					<P>
						Auxlang comes with a variety of modules, and you can write your own — including
						feedback effects — using a DSP-oriented subset of JavaScript.
					</P>
				</div>

				<ul className="mt-6 space-y-2">
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
