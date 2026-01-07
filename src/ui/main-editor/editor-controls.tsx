import { Button } from "@/ui/design/button";

interface EditorControlsProps {
	onRun: () => void;
	onStop: () => void;
	isPlaying: boolean;
}

export function EditorControls({ onRun, onStop, isPlaying }: EditorControlsProps) {
	return (
		<div className="flex gap-2">
			<Button variant="play" onClick={onRun}>
				{isPlaying ? "▶ Restart" : "▶ Run"}
			</Button>
			<Button variant="stop" onClick={onStop} disabled={!isPlaying}>
				⏹ Stop
			</Button>
			<span className="ml-2 text-sm text-surface-600 self-center">
				Ctrl+Enter to run
			</span>
		</div>
	);
}
