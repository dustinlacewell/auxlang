/**
 * The patch list: the user's saved patches (add/rename/delete), persisted
 * via useSavedPatches, over the built-in examples (read-only). A plain
 * column on desktop (md+); below that it's a slide-over drawer opened by a
 * toggle button the caller renders in the embed's tab row.
 */

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { EXAMPLES } from "./examples/examples";
import type { SavedPatch } from "./storage/saved-patches";

export type OpenPatch = { kind: "example"; name: string } | { kind: "saved"; id: string };

interface PatchSidebarProps {
	open: boolean;
	onClose: () => void;
	current: OpenPatch | null;
	savedPatches: readonly SavedPatch[];
	/** The patch just created by onSaveAsNew, so its row opens straight into rename mode. */
	justCreatedId: string | null;
	onPickExample: (name: string) => void;
	onPickSaved: (patch: SavedPatch) => void;
	onSaveAsNew: () => void;
	onRename: (id: string, name: string) => void;
	onRemove: (id: string) => void;
}

function isCurrentExample(current: OpenPatch | null, name: string): boolean {
	return current?.kind === "example" && current.name === name;
}

function isCurrentSaved(current: OpenPatch | null, id: string): boolean {
	return current?.kind === "saved" && current.id === id;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
			{children}
		</div>
	);
}

function RowButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`block w-full text-left px-3 py-1.5 text-sm truncate ${
				active ? "bg-surface-700 text-white" : "text-gray-300 hover:bg-surface-800 hover:text-white"
			}`}
		>
			{children}
		</button>
	);
}

function SavedPatchRow({
	patch,
	active,
	startEditing,
	onPick,
	onRename,
	onRemove,
}: {
	patch: SavedPatch;
	active: boolean;
	startEditing: boolean;
	onPick: () => void;
	onRename: (name: string) => void;
	onRemove: () => void;
}) {
	const [editing, setEditing] = useState(startEditing);
	const [draft, setDraft] = useState(patch.name);

	if (editing) {
		return (
			<form
				className="px-3 py-1"
				onSubmit={(e) => {
					e.preventDefault();
					const name = draft.trim();
					if (name) onRename(name);
					setEditing(false);
				}}
			>
				<input
					// biome-ignore lint/a11y/noAutofocus: opens already focused for rename.
					autoFocus
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={() => setEditing(false)}
					className="w-full bg-surface-900 border border-surface-600 rounded px-2 py-0.5 text-sm text-white"
				/>
			</form>
		);
	}

	return (
		<div
			className={`group flex items-center px-3 py-1.5 text-sm ${
				active ? "bg-surface-700 text-white" : "text-gray-300 hover:bg-surface-800 hover:text-white"
			}`}
		>
			<button type="button" onClick={onPick} className="flex-1 text-left truncate">
				{patch.name}
			</button>
			<button
				type="button"
				title="Rename"
				onClick={() => {
					setDraft(patch.name);
					setEditing(true);
				}}
				className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-white"
			>
				<Pencil size={12} />
			</button>
			<button
				type="button"
				title="Delete"
				onClick={onRemove}
				className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-accent-red"
			>
				<Trash2 size={12} />
			</button>
		</div>
	);
}

function SidebarContent({
	current,
	savedPatches,
	justCreatedId,
	onPickExample,
	onPickSaved,
	onSaveAsNew,
	onRename,
	onRemove,
}: Omit<PatchSidebarProps, "open" | "onClose">) {
	return (
		<div className="flex flex-col h-full overflow-y-auto">
			<div className="flex items-center justify-between pr-2">
				<SectionLabel>my patches</SectionLabel>
				<button
					type="button"
					title="Save current patch as new"
					onClick={onSaveAsNew}
					className="p-1 text-gray-400 hover:text-white"
				>
					<Plus size={14} />
				</button>
			</div>
			{savedPatches.length === 0 && (
				<div className="px-3 py-1 text-xs text-gray-500">No saved patches yet.</div>
			)}
			{savedPatches.map((patch) => (
				<SavedPatchRow
					key={patch.id}
					patch={patch}
					active={isCurrentSaved(current, patch.id)}
					startEditing={patch.id === justCreatedId}
					onPick={() => onPickSaved(patch)}
					onRename={(name) => onRename(patch.id, name)}
					onRemove={() => onRemove(patch.id)}
				/>
			))}

			<SectionLabel>examples</SectionLabel>
			{EXAMPLES.map((ex) => (
				<RowButton
					key={ex.name}
					active={isCurrentExample(current, ex.name)}
					onClick={() => onPickExample(ex.name)}
				>
					{ex.name}
				</RowButton>
			))}
		</div>
	);
}

export function PatchSidebar(props: PatchSidebarProps) {
	return (
		<>
			{/* Desktop: a persistent column. */}
			<div className="hidden md:block w-56 shrink-0 border border-surface-700 rounded bg-surface-900">
				<SidebarContent {...props} />
			</div>

			{/* Mobile: a slide-over drawer. */}
			{props.open && (
				<div className="md:hidden fixed inset-0 z-30">
					<button
						type="button"
						aria-label="Close patch list"
						className="absolute inset-0 bg-black/60"
						onClick={props.onClose}
					/>
					<div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface-900 border-r border-surface-700 shadow-xl flex flex-col">
						<div className="flex items-center justify-between px-3 h-10 border-b border-surface-700">
							<span className="text-xs uppercase tracking-wide text-gray-500">patches</span>
							<button
								type="button"
								aria-label="Close patch list"
								onClick={props.onClose}
								className="p-1 text-gray-400 hover:text-white"
							>
								<X size={16} />
							</button>
						</div>
						<SidebarContent {...props} />
					</div>
				</div>
			)}
		</>
	);
}
