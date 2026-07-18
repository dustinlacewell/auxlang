/**
 * The editor's chrome bar: Run (also Ctrl/Cmd+Enter), Stop, and the Examples
 * dropdown. Matches PlayableEditor's chrome idiom (surface tokens, small icons).
 */

import { ChromeButton, ChromeDivider } from "@/ui/design/chrome-button";
import { CHROME_HEIGHT_CLASS } from "@/ui/design/constants";
import { Play, RefreshCw, Square } from "lucide-react";
import { ExamplePicker } from "./example-picker";

interface EditorControlsProps {
	isPlaying: boolean;
	onRun: () => void;
	onStop: () => void;
	onPickExample: (source: string) => void;
}

export function EditorControls({ isPlaying, onRun, onStop, onPickExample }: EditorControlsProps) {
	return (
		<div className={`flex items-center gap-2 bg-surface-700 border-b border-surface-600 ${CHROME_HEIGHT_CLASS} px-2`}>
			<ExamplePicker onPick={onPickExample} />
			<span className="text-xs text-gray-500">Ctrl+Enter to run</span>
			<div className="flex-1" />
			<ChromeButton onClick={onRun} title="Run (Ctrl+Enter)">
				{isPlaying ? <RefreshCw size={12} /> : <Play size={12} />}
			</ChromeButton>
			<ChromeDivider />
			<ChromeButton onClick={onStop} disabled={!isPlaying} title="Stop">
				<Square size={12} />
			</ChromeButton>
		</div>
	);
}
