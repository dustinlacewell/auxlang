import type { PlaybackState } from "@/ui/audio/types";
import { PlayableEditor } from "@/ui/code-editor/playable-editor";
import { Button } from "@/ui/design/button";
import { Card } from "@/ui/design/card";
import { ChromeButton } from "@/ui/design/chrome-button";
import { ErrorDisplay } from "@/ui/design/error-display";
import { StatusIndicator } from "@/ui/design/status-indicator";
import { displayNameToCategory } from "@/tests/interactive/parser";
import { Trash2, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type TestDefinition, getCategories, getDevices } from "./test-data";
import { TestEditorModal } from "./test-editor-modal";

const allCategories = getCategories();
const allDevices = getDevices();

interface TestCardProps {
	test: TestDefinition;
	state: PlaybackState;
	error?: string | undefined;
	color?: string;
	onPlay: (code: string) => void;
	onStop: () => void;
}

const isDev = import.meta.env.DEV;

export function TestCard({ test, state, error, color, onPlay, onStop }: TestCardProps) {
	const [code, setCode] = useState(test.code);
	const [name, setName] = useState(test.name);
	const [desc, setDesc] = useState(test.desc);
	const [category, setCategory] = useState(test.category);
	const [device, setDevice] = useState(test.device);
	const [id, setId] = useState(test.id);
	const [editingName, setEditingName] = useState(false);
	const [editingDesc, setEditingDesc] = useState(false);
	const [editingMeta, setEditingMeta] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const descInputRef = useRef<HTMLInputElement>(null);
	const categorySelectRef = useRef<HTMLSelectElement>(null);

	// Sync when test changes (e.g., HMR update)
	useEffect(() => {
		setCode(test.code);
		setName(test.name);
		setDesc(test.desc);
		setCategory(test.category);
		setDevice(test.device);
		setId(test.id);
		setSaveError(null);
	}, [test.code, test.name, test.desc, test.category, test.device, test.id]);

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

	useEffect(() => {
		if (editingMeta && categorySelectRef.current) {
			categorySelectRef.current.focus();
		}
	}, [editingMeta]);

	const handlePlay = useCallback(() => {
		onPlay(code);
	}, [code, onPlay]);

	const hasChanges =
		code !== test.code ||
		name !== test.name ||
		desc !== test.desc ||
		category !== test.category ||
		device !== test.device ||
		id !== test.id;

	const computedPath = `${displayNameToCategory(category)}/${device}/${id}.js`;

	const handleSave = useCallback(async () => {
		if (!isDev) return;

		setSaving(true);
		setSaveError(null);

		try {
			const res = await fetch("/api/test/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					category,
					device,
					id,
					name,
					desc,
					code,
					originalPath: test.filePath,
				}),
			});

			const result = await res.json();
			if (!result.success) {
				setSaveError(result.error || "Save failed");
			}
		} catch (err) {
			setSaveError(String(err));
		} finally {
			setSaving(false);
		}
	}, [category, device, id, name, desc, code, test.filePath]);

	const handleDelete = useCallback(async () => {
		if (!isDev) return;

		const confirmed = window.confirm(`Delete test "${test.name}"?\n\nThis will delete the file:\n${test.filePath}`);
		if (!confirmed) return;

		try {
			const res = await fetch("/api/test/delete", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					category: test.category,
					device: test.device,
					id: test.id,
				}),
			});

			const result = await res.json();
			if (!result.success) {
				setSaveError(result.error || "Delete failed");
			}
		} catch (err) {
			setSaveError(String(err));
		}
	}, [test.name, test.filePath, test.category, test.device, test.id]);

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
						style={{ color }}
						className={isDev ? "cursor-pointer hover:brightness-125 flex-1" : "flex-1"}
						title={isDev ? "Double-click to edit" : undefined}
					>
						{name}
					</span>
				)}
				{isDev && (
					<>
						<ChromeButton onClick={() => setShowEditModal(true)} title="Edit in modal" rounded>
							<Wrench size={12} />
						</ChromeButton>
						<ChromeButton onClick={handleDelete} title="Delete test" rounded>
							<Trash2 size={12} />
						</ChromeButton>
					</>
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
			{isDev && (
				<div className="mb-2">
					{editingMeta ? (
						<div
							className="flex gap-2 text-xs"
							onBlur={(e) => {
								// Only close if focus moved outside this container
								if (!e.currentTarget.contains(e.relatedTarget)) {
									setEditingMeta(false);
								}
							}}
						>
							<select
								ref={categorySelectRef}
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								onKeyDown={(e) => e.key === "Escape" && setEditingMeta(false)}
								className="bg-surface-700 border border-surface-600 rounded px-1 py-0.5"
							>
								{allCategories.map((cat) => (
									<option key={cat} value={cat}>
										{cat}
									</option>
								))}
							</select>
							<select
								value={device}
								onChange={(e) => setDevice(e.target.value)}
								onKeyDown={(e) => e.key === "Escape" && setEditingMeta(false)}
								className="bg-surface-700 border border-surface-600 rounded px-1 py-0.5"
							>
								{allDevices.map((dev) => (
									<option key={dev} value={dev}>
										{dev}
									</option>
								))}
							</select>
							<input
								type="text"
								value={id}
								onChange={(e) => setId(e.target.value)}
								onKeyDown={(e) => e.key === "Escape" && setEditingMeta(false)}
								placeholder="id"
								className="bg-surface-700 border border-surface-600 rounded px-1 py-0.5 flex-1"
							/>
						</div>
					) : (
						<p
							onDoubleClick={() => setEditingMeta(true)}
							className="text-xs text-gray-500 font-mono cursor-pointer hover:text-gray-400"
							title="Double-click to edit path"
						>
							{computedPath}
						</p>
					)}
				</div>
			)}
			<PlayableEditor
				value={code}
				onChange={setCode}
				state={state}
				onPlay={handlePlay}
				onStop={onStop}
				className="mb-2"
			/>
			{isDev && hasChanges && (
				<Button variant="default" onClick={handleSave} disabled={saving} className="w-full">
					{saving ? "Saving..." : "Save"}
				</Button>
			)}
			{error && <ErrorDisplay message={error} />}
			{saveError && <ErrorDisplay message={saveError} />}
			{showEditModal && <TestEditorModal test={test} onClose={() => setShowEditModal(false)} />}
		</Card>
	);
}
