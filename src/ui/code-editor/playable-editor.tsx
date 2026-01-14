import type { PlaybackState } from "@/ui/audio/types";
import { ChromeButton, ChromeDivider } from "@/ui/design/chrome-button";
import { CHROME_HEIGHT_CLASS } from "@/ui/design/constants";
import { Play, RefreshCw, Square } from "lucide-react";
import { CodeEditor } from "./code-editor";

interface PlayableEditorProps {
	value: string;
	onChange: (value: string) => void;
	state: PlaybackState;
	onPlay: () => void;
	onStop: () => void;
	className?: string;
	maxHeight?: string;
	graphId?: string | undefined;
	error?: string | null;
}

export function PlayableEditor({
	value,
	onChange,
	state,
	onPlay,
	onStop,
	className = "",
	maxHeight,
	graphId,
	error,
}: PlayableEditorProps) {
	const isPlaying = state === "playing";

	return (
		<div className={`border border-surface-600 rounded overflow-hidden ${className}`}>
			<div className={`flex items-center gap-2 bg-surface-700 border-b border-surface-600 ${CHROME_HEIGHT_CLASS} px-2`}>
				{error && (
					<span className="text-accent-red text-xs font-mono truncate max-w-md">
						{error}
					</span>
				)}
				<div className="flex-1" />
				<ChromeButton onClick={onPlay} title="Play (Ctrl+Enter)">
					{isPlaying ? <RefreshCw size={12} /> : <Play size={12} />}
				</ChromeButton>
				<ChromeDivider />
				<ChromeButton onClick={onStop} disabled={!isPlaying} title="Stop">
					<Square size={12} />
				</ChromeButton>
			</div>
			<div style={maxHeight ? { maxHeight } : undefined} className={maxHeight ? "overflow-y-auto" : ""}>
				<CodeEditor 
					value={value} 
					onChange={onChange} 
					onRun={onPlay} 
					className="text-xs border-0"
					{...(graphId ? { graphId } : {})}
				/>
			</div>
		</div>
	);
}
