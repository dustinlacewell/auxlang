import type { PlaybackState } from "@/ui/audio/types";
import { CodeEditor } from "@/ui/code-editor/code-editor";
import { Button } from "@/ui/design/button";
import { Card } from "@/ui/design/card";
import { ErrorDisplay } from "@/ui/design/error-display";
import { StatusIndicator } from "@/ui/design/status-indicator";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TestDefinition } from "./test-data";
import { serializeTestCase } from "@/tests/interactive/parser";

interface TestCardProps {
	test: TestDefinition;
	state: PlaybackState;
	error?: string | undefined;
	onPlay: (code: string) => void;
	onStop: () => void;
}

const isDev = import.meta.env.DEV;

export function TestCard({ test, state, error, onPlay, onStop }: TestCardProps) {
	const [code, setCode] = useState(test.code);
	const [name, setName] = useState(test.name);
	const [desc, setDesc] = useState(test.desc);
	const [editingName, setEditingName] = useState(false);
	const [editingDesc, setEditingDesc] = useState(false);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const descInputRef = useRef<HTMLInputElement>(null);

	// Sync when test changes (e.g., HMR update)
	useEffect(() => {
		setCode(test.code);
		setName(test.name);
		setDesc(test.desc);
	}, [test.code, test.name, test.desc]);

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

	const hasChanges = code !== test.code || name !== test.name || desc !== test.desc;

	const handleSave = useCallback(async () => {
		if (!isDev) return;

		const content = serializeTestCase({ name, desc, code });

		try {
			// Use File System Access API - browser will prompt for location
			const handle = await window.showSaveFilePicker({
				suggestedName: `${test.id}.js`,
				types: [
					{
						description: "JavaScript files",
						accept: { "text/javascript": [".js"] },
					},
				],
			});

			const writable = await handle.createWritable();
			await writable.write(content);
			await writable.close();
		} catch (err) {
			// User cancelled or error
			if ((err as Error).name !== "AbortError") {
				console.error("Failed to save:", err);
			}
		}
	}, [name, desc, code, test.id]);

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
				{editingName && isDev ? (
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
						onDoubleClick={() => isDev && setEditingName(true)}
						className={isDev ? "cursor-pointer hover:text-accent-blue" : ""}
						title={isDev ? "Double-click to edit" : undefined}
					>
						{name}
					</span>
				)}
			</div>
			{editingDesc && isDev ? (
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
					onDoubleClick={() => isDev && setEditingDesc(true)}
					className={`text-sm text-gray-400 mb-2 ${isDev ? "cursor-pointer hover:text-gray-300" : ""}`}
					title={isDev ? "Double-click to edit" : undefined}
				>
					{desc}
				</p>
			)}
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
				{isDev && hasChanges && (
					<Button variant="default" onClick={handleSave} className="ml-auto">
						💾 Save
					</Button>
				)}
			</div>
			{error && <ErrorDisplay message={error} />}
		</Card>
	);
}
