import type { PlaybackState } from "@/ui/audio/types";
import { CodeEditor } from "@/ui/code-editor/code-editor";
import { Button } from "@/ui/design/button";
import { Card } from "@/ui/design/card";
import { ErrorDisplay } from "@/ui/design/error-display";
import { StatusIndicator } from "@/ui/design/status-indicator";
import { useCallback, useEffect, useState } from "react";
import type { TestDefinition } from "./test-data";

interface TestCardProps {
	test: TestDefinition;
	state: PlaybackState;
	error?: string | undefined;
	onPlay: (code: string) => void;
	onStop: () => void;
}

export function TestCard({ test, state, error, onPlay, onStop }: TestCardProps) {
	const [code, setCode] = useState(test.code);

	// Sync code when test changes (e.g., HMR update)
	useEffect(() => {
		setCode(test.code);
	}, [test.code]);

	const handlePlay = useCallback(() => {
		onPlay(code);
	}, [code, onPlay]);

	return (
		<Card status={state}>
			<div className="flex items-center gap-2 mb-1 font-bold">
				<StatusIndicator status={state} />
				<span>{test.name}</span>
			</div>
			<p className="text-sm text-gray-400 mb-2">{test.desc}</p>
			<div className="mb-2 max-h-[200px] overflow-y-auto rounded">
				<CodeEditor value={code} onChange={setCode} onRun={handlePlay} className="text-xs" />
			</div>
			<div className="flex gap-2">
				<Button variant="play" onClick={handlePlay}>
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
