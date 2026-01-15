/**
 * Generic card for displaying a code example with play/stop controls.
 * Domain-specific editing can be added via slots.
 */

import type { PlaybackState } from "@/ui/audio/types";
import { PlayableEditor } from "@/ui/code-editor/playable-editor";
import { Card } from "@/ui/design/card";
import { ErrorDisplay } from "@/ui/design/error-display";
import { StatusIndicator } from "@/ui/design/status-indicator";
import { useCallback, useEffect, useRef, useState } from "react";

const isDev = import.meta.env.DEV;

export interface ExampleCardExample {
	id: string;
	name: string;
	desc: string;
	code: string;
}

interface ExampleCardProps {
	example: ExampleCardExample;
	state: PlaybackState;
	error?: string;
	color?: string;
	graphId?: string;
	onPlay: (code: string) => void;
	onStop: () => void;
	/** Extra buttons to show in header (e.g., edit, delete) */
	headerActions?: React.ReactNode;
	/** Content to show below description (e.g., file path, metadata editor) */
	metaContent?: React.ReactNode;
	/** Called when name changes (dev mode only) */
	onNameChange?: (name: string) => void;
	/** Called when description changes (dev mode only) */
	onDescChange?: (desc: string) => void;
	/** Called when code changes */
	onCodeChange?: (code: string) => void;
	/** Additional error to display (e.g., save error) */
	secondaryError?: string;
	/** Extra content below the editor (e.g., save button) */
	footer?: React.ReactNode;
}

export function ExampleCard({
	example,
	state,
	error,
	color,
	graphId,
	onPlay,
	onStop,
	headerActions,
	metaContent,
	onNameChange,
	onDescChange,
	onCodeChange,
	secondaryError,
	footer,
}: ExampleCardProps) {
	const [code, setCode] = useState(example.code);
	const [name, setName] = useState(example.name);
	const [desc, setDesc] = useState(example.desc);
	const [editingName, setEditingName] = useState(false);
	const [editingDesc, setEditingDesc] = useState(false);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const descInputRef = useRef<HTMLInputElement>(null);

	// Sync when example changes (e.g., HMR update)
	useEffect(() => {
		setCode(example.code);
		setName(example.name);
		setDesc(example.desc);
	}, [example.code, example.name, example.desc]);

	// Propagate changes up
	useEffect(() => {
		onCodeChange?.(code);
	}, [code, onCodeChange]);

	useEffect(() => {
		onNameChange?.(name);
	}, [name, onNameChange]);

	useEffect(() => {
		onDescChange?.(desc);
	}, [desc, onDescChange]);

	// Focus input when editing starts
	useEffect(() => {
		if (editingName && nameInputRef.current) {
			nameInputRef.current.focus();
			nameInputRef.current.select();
		}
	}, [editingName]);

	useEffect(() => {
		if (editingDesc && descInputRef.current) {
			descInputRef.current.focus();
			descInputRef.current.select();
		}
	}, [editingDesc]);

	const handlePlay = useCallback(() => {
		onPlay(code);
	}, [code, onPlay]);

	const handleNameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === "Escape") {
			setEditingName(false);
		}
	};

	const handleDescKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === "Escape") {
			setEditingDesc(false);
		}
	};

	return (
		<Card status={state}>
			<div className="flex items-center gap-2 mb-1 font-bold">
				<StatusIndicator status={state} />
				{editingName && isDev && onNameChange ? (
					<input
						ref={nameInputRef}
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onBlur={() => setEditingName(false)}
						onKeyDown={handleNameKeyDown}
						className="bg-surface-700 border border-surface-600 rounded px-1 text-sm flex-1"
					/>
				) : (
					<span
						onDoubleClick={() => isDev && onNameChange && setEditingName(true)}
						style={{ color }}
						className={isDev && onNameChange ? "cursor-pointer hover:brightness-125 flex-1" : "flex-1"}
						title={isDev && onNameChange ? "Double-click to edit" : undefined}
					>
						{name}
					</span>
				)}
				{headerActions}
			</div>
			{editingDesc && isDev && onDescChange ? (
				<input
					ref={descInputRef}
					type="text"
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					onBlur={() => setEditingDesc(false)}
					onKeyDown={handleDescKeyDown}
					className="bg-surface-700 border border-surface-600 rounded px-1 text-sm text-gray-400 mb-2 w-full"
				/>
			) : (
				<p
					onDoubleClick={() => isDev && onDescChange && setEditingDesc(true)}
					className={`text-sm text-gray-400 mb-2 ${isDev && onDescChange ? "cursor-pointer hover:text-gray-300" : ""}`}
					title={isDev && onDescChange ? "Double-click to edit" : undefined}
				>
					{desc}
				</p>
			)}
			{metaContent}
			<PlayableEditor
				value={code}
				onChange={setCode}
				state={state}
				onPlay={handlePlay}
				onStop={onStop}
				className="mb-2"
				{...(graphId ? { graphId } : {})}
			/>
			{footer}
			{error && <ErrorDisplay message={error} />}
			{secondaryError && <ErrorDisplay message={secondaryError} />}
		</Card>
	);
}
