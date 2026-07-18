/**
 * One documentation example: description, the patch, and Run/Stop. Mirrors the
 * test-suite ExampleCard's visual structure (status dot + title, gray
 * description, code, controls, loud error) but the code is read-only.
 */

import { Button } from "@/ui/design/button";
import { Card } from "@/ui/design/card";
import { ErrorDisplay } from "@/ui/design/error-display";
import { StatusIndicator } from "@/ui/design/status-indicator";
import { Play, Square } from "lucide-react";
import { CodeBlock } from "./code-block";
import type { DocExample } from "./doc-example";

interface DocCardProps {
	example: DocExample;
	playing: boolean;
	error?: string;
	onRun: () => void;
	onStop: () => void;
}

export function DocCard({ example, playing, error, onRun, onStop }: DocCardProps) {
	const status = error ? "error" : playing ? "playing" : "idle";
	return (
		<Card status={status}>
			<div className="flex items-center gap-2 mb-1 font-bold">
				<StatusIndicator status={status} />
				<span className="flex-1">{example.title}</span>
			</div>
			<p className="text-sm text-gray-400 mb-2">{example.description}</p>
			<CodeBlock code={example.code} />
			<div className="flex gap-2">
				<Button variant="play" onClick={onRun}>
					<span className="flex items-center gap-1.5">
						<Play size={14} />
						Run
					</span>
				</Button>
				<Button variant="stop" onClick={onStop} disabled={!playing}>
					<span className="flex items-center gap-1.5">
						<Square size={14} />
						Stop
					</span>
				</Button>
			</div>
			{error && <ErrorDisplay message={error} />}
		</Card>
	);
}
