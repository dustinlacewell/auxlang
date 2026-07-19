import type { PlaybackState } from "@/ui/audio/types";

interface StatusIndicatorProps {
	status: PlaybackState;
}

const statusColorStyles: Record<PlaybackState, string> = {
	idle: "bg-surface-600",
	playing: "bg-white",
	error: "bg-accent-red",
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
	return <span className={`inline-block w-2 h-2 rounded-full ${statusColorStyles[status]}`} />;
}
