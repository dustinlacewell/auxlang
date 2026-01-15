/**
 * Device test card - extends ExampleCard with device-specific editing.
 */

import { displayNameToCategory } from "@/tests/interactive/parser";
import { ChromeButton } from "@/ui/design/chrome-button";
import { Button } from "@/ui/design/button";
import { Trash2, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExampleCard } from "../shared/example-card";
import type { DeviceExample } from "../shared/types";
import { getCategories, getDevices } from "./device-test-data";
import { DeviceTestEditorModal } from "./device-test-editor-modal";
import type { PlaybackState } from "@/ui/audio/types";

const allCategories = getCategories();
const allDevices = getDevices();
const isDev = import.meta.env.DEV;

interface DeviceTestCardProps {
	test: DeviceExample;
	state: PlaybackState;
	error?: string;
	color?: string;
	graphId?: string;
	onPlay: (code: string) => void;
	onStop: () => void;
}

export function DeviceTestCard({ test, state, error, color, graphId, onPlay, onStop }: DeviceTestCardProps) {
	const [name, setName] = useState(test.name);
	const [desc, setDesc] = useState(test.desc);
	const [code, setCode] = useState(test.code);
	const [category, setCategory] = useState(test.category);
	const [device, setDevice] = useState(test.device);
	const [id, setId] = useState(test.id);
	const [editingMeta, setEditingMeta] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const categorySelectRef = useRef<HTMLSelectElement>(null);

	// Sync when test changes (e.g., HMR update)
	useEffect(() => {
		setName(test.name);
		setDesc(test.desc);
		setCode(test.code);
		setCategory(test.category);
		setDevice(test.device);
		setId(test.id);
		setSaveError(null);
	}, [test.name, test.desc, test.code, test.category, test.device, test.id]);

	useEffect(() => {
		if (editingMeta && categorySelectRef.current) {
			categorySelectRef.current.focus();
		}
	}, [editingMeta]);

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

	const headerActions = isDev ? (
		<>
			<ChromeButton onClick={() => setShowEditModal(true)} title="Edit in modal" rounded>
				<Wrench size={12} />
			</ChromeButton>
			<ChromeButton onClick={handleDelete} title="Delete test" rounded>
				<Trash2 size={12} />
			</ChromeButton>
		</>
	) : null;

	const metaContent = isDev ? (
		<div className="mb-2">
			{editingMeta ? (
				<div
					className="flex gap-2 text-xs"
					onBlur={(e) => {
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
	) : null;

	const footer =
		isDev && hasChanges ? (
			<Button variant="default" onClick={handleSave} disabled={saving} className="w-full">
				{saving ? "Saving..." : "Save"}
			</Button>
		) : null;

	return (
		<>
			<ExampleCard
				example={test}
				state={state}
				error={error}
				color={color}
				graphId={graphId}
				onPlay={onPlay}
				onStop={onStop}
				headerActions={headerActions}
				metaContent={metaContent}
				onNameChange={isDev ? setName : undefined}
				onDescChange={isDev ? setDesc : undefined}
				onCodeChange={setCode}
				secondaryError={saveError ?? undefined}
				footer={footer}
			/>
			{showEditModal && <DeviceTestEditorModal test={test} onClose={() => setShowEditModal(false)} />}
		</>
	);
}
