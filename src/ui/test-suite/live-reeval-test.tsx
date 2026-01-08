import { useState, useRef, useCallback, useEffect } from "react";
import * as api from "@/editor/api";
import { resetIdCounter } from "@/descriptor/identity";
import { clearRegistry } from "@/descriptor/registry";
import type { Graph } from "@/graph/types";
import {
	createAudioInstance,
	stopInstance,
	sendGraph,
} from "@/ui/audio/create-audio-instance";
import type { AudioInstance } from "@/ui/audio/types";
import { Card } from "@/ui/design/card";
import { Button } from "@/ui/design/button";

interface ReEvalTestCase {
	id: string;
	name: string;
	desc: string;
	codeA: string;
	codeB: string;
}

const testCases: ReEvalTestCase[] = [
	{
		id: "pattern-change",
		name: "Pattern Change (Same Length)",
		desc: "Switch between two 2-note patterns. Position should be preserved.",
		codeA: `let c = clock(120)
let s = seq("c3 g3").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.1)
return out(gain(o).amount(e))`,
		codeB: `let c = clock(120)
let s = seq("e3 a3").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.1)
return out(gain(o).amount(e))`,
	},
	{
		id: "pattern-length-change",
		name: "Pattern Length Change",
		desc: "Switch from 2-note to 3-note pattern. Beat position should wrap.",
		codeA: `let c = clock(120)
let s = seq("c3 e3").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.1)
return out(gain(o).amount(e))`,
		codeB: `let c = clock(120)
let s = seq("c3 e3 g3").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.1)
return out(gain(o).amount(e))`,
	},
	{
		id: "bpm-change",
		name: "BPM Change",
		desc: "Switch from 120 BPM to 180 BPM. 8-note chromatic scale makes timing obvious.",
		codeA: `let c = clock(120)
let s = seq("c3 c#3 d3 d#3 e3 f3 f#3 g3").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.1)
return out(gain(o).amount(e))`,
		codeB: `let c = clock(180)
let s = seq("c3 c#3 d3 d#3 e3 f3 f#3 g3").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.1)
return out(gain(o).amount(e))`,
	},
	{
		id: "long-note",
		name: "Long Note Interrupt",
		desc: "Pattern has a long note (bb8). Switching mid-note should not cut off abruptly.",
		codeA: `let c = clock(60)
let s = seq("gb2 bb8").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.3)
return out(gain(o).amount(e))`,
		codeB: `let c = clock(60)
let s = seq("gb2 bb2").trig(c)
let o = osc(s.cv)
let e = env(s.gate).attack(0.01).release(0.3)
return out(gain(o).amount(e))`,
	},
	{
		id: "osc-type",
		name: "Oscillator Type Change",
		desc: "Switch from saw to sine. Phase should continue smoothly.",
		codeA: `let c = clock(120)
let s = seq("c3 e3 g3").trig(c)
let o = saw(s.cv)
let e = env(s.gate).attack(0.01).release(0.2)
return out(gain(o).amount(e))`,
		codeB: `let c = clock(120)
let s = seq("c3 e3 g3").trig(c)
let o = sin(s.cv)
let e = env(s.gate).attack(0.01).release(0.2)
return out(gain(o).amount(e))`,
	},
	{
		id: "filter-cutoff",
		name: "Filter Cutoff Change",
		desc: "Switch filter cutoff. Should sound smooth, no clicks.",
		codeA: `let c = clock(120)
let s = seq("c2 e2 g2 c3").trig(c)
let o = saw(s.cv)
let e = env(s.gate).attack(0.01).release(0.2)
let f = lpf(gain(o).amount(e)).cutoff(800)
return out(f)`,
		codeB: `let c = clock(120)
let s = seq("c2 e2 g2 c3").trig(c)
let o = saw(s.cv)
let e = env(s.gate).attack(0.01).release(0.2)
let f = lpf(gain(o).amount(e)).cutoff(2000)
return out(f)`,
	},
];

function evaluateCode(code: string): Graph | null {
	resetIdCounter();
	clearRegistry();

	try {
		const wrappedCode = code.includes("return") ? code : `return (${code})`;
		const fn = new Function(...Object.keys(api), wrappedCode);
		const result = fn(...Object.values(api));

		if (result && typeof result === "object" && "nodes" in result) {
			return result as Graph;
		}
	} catch (err) {
		console.error("Eval error:", err);
	}
	return null;
}

interface TestCardProps {
	test: ReEvalTestCase;
}

function ReEvalTestCard({ test }: TestCardProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [activeCode, setActiveCode] = useState<"A" | "B">("A");
	const [error, setError] = useState<string | null>(null);
	const instanceRef = useRef<AudioInstance | null>(null);

	const start = useCallback(async () => {
		if (instanceRef.current) {
			stopInstance(instanceRef.current);
		}

		try {
			const instance = await createAudioInstance();
			instanceRef.current = instance;

			const graph = evaluateCode(test.codeA);
			if (graph) {
				await sendGraph(instance, graph);
				setIsPlaying(true);
				setActiveCode("A");
				setError(null);
			} else {
				setError("Failed to evaluate code A");
			}
		} catch (err) {
			setError(String(err));
		}
	}, [test.codeA]);

	const stop = useCallback(() => {
		if (instanceRef.current) {
			stopInstance(instanceRef.current);
			instanceRef.current = null;
		}
		setIsPlaying(false);
	}, []);

	const switchTo = useCallback(
		async (which: "A" | "B") => {
			if (!instanceRef.current || !isPlaying) return;

			const code = which === "A" ? test.codeA : test.codeB;
			const graph = evaluateCode(code);
			if (graph) {
				await sendGraph(instanceRef.current, graph);
				setActiveCode(which);
				setError(null);
			} else {
				setError(`Failed to evaluate code ${which}`);
			}
		},
		[isPlaying, test.codeA, test.codeB]
	);

	useEffect(() => {
		return () => {
			if (instanceRef.current) {
				stopInstance(instanceRef.current);
			}
		};
	}, []);

	return (
		<Card status={isPlaying ? "playing" : "idle"}>
			<div className="font-bold mb-1">{test.name}</div>
			<p className="text-sm text-gray-400 mb-3">{test.desc}</p>

			<div className="grid grid-cols-2 gap-2 mb-3">
				<div>
					<div
						className={`text-xs font-semibold mb-1 ${activeCode === "A" && isPlaying ? "text-green-400" : "text-gray-500"}`}
					>
						Code A {activeCode === "A" && isPlaying && "(active)"}
					</div>
					<pre className="text-xs bg-surface-900 p-2 rounded overflow-auto max-h-[100px] font-mono">
						{test.codeA}
					</pre>
				</div>
				<div>
					<div
						className={`text-xs font-semibold mb-1 ${activeCode === "B" && isPlaying ? "text-green-400" : "text-gray-500"}`}
					>
						Code B {activeCode === "B" && isPlaying && "(active)"}
					</div>
					<pre className="text-xs bg-surface-900 p-2 rounded overflow-auto max-h-[100px] font-mono">
						{test.codeB}
					</pre>
				</div>
			</div>

			<div className="flex gap-2 flex-wrap">
				{!isPlaying ? (
					<Button variant="play" onClick={start}>
						Start
					</Button>
				) : (
					<>
						<Button
							variant={activeCode === "A" ? "play" : "default"}
							onClick={() => switchTo("A")}
						>
							Switch to A
						</Button>
						<Button
							variant={activeCode === "B" ? "play" : "default"}
							onClick={() => switchTo("B")}
						>
							Switch to B
						</Button>
						<Button variant="stop" onClick={stop}>
							Stop
						</Button>
					</>
				)}
			</div>

			{error && (
				<div className="mt-2 text-red-400 text-sm bg-red-900/20 p-2 rounded">
					{error}
				</div>
			)}
		</Card>
	);
}

export function LiveReEvalTest() {
	return (
		<div className="min-h-screen p-5 max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold mb-2">Live Re-Eval Test</h1>
			<p className="text-gray-400 text-sm mb-4">
				Test live code switching. Click "Start" to begin playback, then use
				"Switch to A/B" to swap between code versions. The audio should
				transition smoothly without resetting the pattern or causing clicks.
			</p>

			<div className="space-y-4">
				{testCases.map((test) => (
					<ReEvalTestCard key={test.id} test={test} />
				))}
			</div>
		</div>
	);
}
