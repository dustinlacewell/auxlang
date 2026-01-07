import { Card } from "@/ui/design/card";
import { Button } from "@/ui/design/button";
import { StatusIndicator } from "@/ui/design/status-indicator";
import { ErrorDisplay } from "@/ui/design/error-display";
import type { TestDefinition } from "./test-data";
import type { PlaybackState } from "@/ui/audio/types";

interface TestCardProps {
	test: TestDefinition;
	state: PlaybackState;
	error?: string | undefined;
	onPlay: () => void;
	onStop: () => void;
}

export function TestCard({
	test,
	state,
	error,
	onPlay,
	onStop,
}: TestCardProps) {
	return (
		<Card status={state}>
			<div className="flex items-center gap-2 mb-1 font-bold">
				<StatusIndicator status={state} />
				<span>{test.name}</span>
			</div>
			<p className="text-sm text-gray-400 mb-2">{test.desc}</p>
			<pre className="text-xs bg-surface-900 p-2 rounded overflow-auto max-h-[120px] mb-2 font-mono">
				{test.code}
			</pre>
			<div className="flex gap-2">
				<Button variant="play" onClick={onPlay}>
					{state === "playing" ? "▶ Restart" : "▶ Play"}
				</Button>
				<Button variant="stop" onClick={onStop} disabled={state !== "playing"}>
					⏹ Stop
				</Button>
			</div>
			{error && <ErrorDisplay message={error} />}
		</Card>
	);
}
