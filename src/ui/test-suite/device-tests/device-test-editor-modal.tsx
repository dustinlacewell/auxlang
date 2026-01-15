/**
 * Modal for editing/creating device tests with graph visualization.
 */

import * as api from "@/core2/api";
import { evalToStages, type EvalResult } from "@/core2/eval/pipeline";
import { graphToDot, stereoGraphToDot } from "@/core2/viz/graph-to-dot";
import { displayNameToCategory } from "@/tests/interactive/parser";
import { useCore2Audio } from "@/ui/audio/use-core2-audio";
import { PlayableEditor } from "@/ui/code-editor/playable-editor";
import { GraphViewer, type Transform } from "@/ui/core2-editor/graph-viewer";
import { Button } from "@/ui/design/button";
import { CHROME_HEIGHT_CLASS } from "@/ui/design/constants";
import { useCallback, useEffect, useState } from "react";
import type { DeviceExample } from "../shared/types";
import { getCategories, getDevices } from "./device-test-data";

const allCategories = getCategories();
const allDevices = getDevices();

type TabId = "raw-graph" | "expanded-graph" | "raw-json" | "expanded-json";

interface DeviceTestEditorModalProps {
	test?: DeviceExample;
	onClose: () => void;
}

function toKebabCase(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function DeviceTestEditorModal({ test, onClose }: DeviceTestEditorModalProps) {
	const isNew = !test;
	const [name, setName] = useState(test?.name ?? "New Test");
	const [desc, setDesc] = useState(test?.desc ?? "Description of what to expect");
	const [code, setCode] = useState(test?.code ?? "sin(440).out()");
	const [category, setCategory] = useState(test?.category ?? "Oscillators");
	const [device, setDevice] = useState(test?.device ?? "sin");
	const [id, setId] = useState(test?.id ?? "new-test");
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<TabId>("raw-graph");
	const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
	const [rawDot, setRawDot] = useState<string | null>(null);
	const [expandedDot, setExpandedDot] = useState<string | null>(null);
	const [sharedGraphTransform, setSharedGraphTransform] = useState<Transform | undefined>(undefined);
	const [sharedShowOrphaned, setSharedShowOrphaned] = useState(false);
	const { play, stop, getState } = useCore2Audio();

	const testId = test ? `__edit_${test.id}__` : "__new_test__";
	const { state, error } = getState(testId);

	// Prevent body scroll while modal is open
	useEffect(() => {
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, []);

	// Generate graphs on initial load
	useEffect(() => {
		try {
			const result = evalToStages(code, api);
			setEvalResult(result);
			setRawDot(graphToDot(result.graph));
			setExpandedDot(stereoGraphToDot(result.expanded));
		} catch (err) {
			console.error("Graph generation failed:", err);
		}
		// Only run on mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const computedPath = `${displayNameToCategory(category)}/${device}/${id}.js`;

	const handlePlay = useCallback(() => {
		try {
			const result = evalToStages(code, api);
			setEvalResult(result);
			setRawDot(graphToDot(result.graph));
			setExpandedDot(stereoGraphToDot(result.expanded));
			setSharedGraphTransform(undefined);
		} catch (err) {
			console.error("Graph generation failed:", err);
			setEvalResult(null);
			setRawDot(null);
			setExpandedDot(null);
		}
		play(testId, code);
	}, [play, code, testId]);

	const handleStop = useCallback(() => {
		stop(testId);
	}, [stop, testId]);

	const handleSave = useCallback(async () => {
		if (!category || !device || !id) {
			setSaveError("Category, device, and ID are required");
			return;
		}

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
					originalPath: test?.filePath,
				}),
			});

			const result = await res.json();
			if (result.success) {
				stop(testId);
				onClose();
			} else {
				setSaveError(result.error || "Save failed");
			}
		} catch (err) {
			setSaveError(String(err));
		} finally {
			setSaving(false);
		}
	}, [category, device, id, name, desc, code, test?.filePath, onClose, stop, testId]);

	const handleNameChange = useCallback(
		(newName: string) => {
			setName(newName);
			if (isNew) {
				setId(toKebabCase(newName));
			}
		},
		[isNew],
	);

	const handleClose = useCallback(() => {
		stop(testId);
		onClose();
	}, [stop, onClose, testId]);

	const tabs: { id: TabId; label: string }[] = [
		{ id: "raw-graph", label: "Raw Graph" },
		{ id: "expanded-graph", label: "Expanded" },
		{ id: "raw-json", label: "Raw JSON" },
		{ id: "expanded-json", label: "Expanded JSON" },
	];

	return (
		<div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-8 pb-8 overflow-y-auto scrollbar-hide">
			<div className="bg-surface-800 rounded-lg p-6 w-full max-w-4xl shadow-xl mb-8">
				<h2 className="text-xl font-bold mb-4">{isNew ? "New Test Case" : "Edit Test Case"}</h2>

				<div className="space-y-4">
					<div className="flex gap-4">
						<div className="flex-1">
							<label className="block text-sm text-gray-400 mb-1">Name</label>
							<input
								type="text"
								value={name}
								onChange={(e) => handleNameChange(e.target.value)}
								className="w-full bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm"
							/>
						</div>
						<div className="flex-1">
							<label className="block text-sm text-gray-400 mb-1">Description</label>
							<input
								type="text"
								value={desc}
								onChange={(e) => setDesc(e.target.value)}
								className="w-full bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm"
							/>
						</div>
					</div>

					<div className="flex gap-4">
						<div>
							<label className="block text-sm text-gray-400 mb-1">Category</label>
							<select
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className="bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm"
							>
								{allCategories.map((cat) => (
									<option key={cat} value={cat}>
										{cat}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm text-gray-400 mb-1">Device</label>
							<select
								value={device}
								onChange={(e) => setDevice(e.target.value)}
								className="bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm"
							>
								{allDevices.map((dev) => (
									<option key={dev} value={dev}>
										{dev}
									</option>
								))}
							</select>
						</div>
						<div className="flex-1">
							<label className="block text-sm text-gray-400 mb-1">ID (filename)</label>
							<input
								type="text"
								value={id}
								onChange={(e) => setId(e.target.value)}
								placeholder="e.g., sin-default"
								className="w-full bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm font-mono"
							/>
						</div>
					</div>

					<p className="text-xs text-gray-500 font-mono">{computedPath}</p>

					<div>
						<label className="block text-sm text-gray-400 mb-1">Code</label>
						<PlayableEditor
							value={code}
							onChange={setCode}
							state={state}
							onPlay={handlePlay}
							onStop={handleStop}
						/>
					</div>

					{/* Graph visualization tabs */}
					<div className="border border-surface-600 rounded overflow-hidden">
						<div className={`flex bg-surface-700 border-b border-surface-600 ${CHROME_HEIGHT_CLASS}`}>
							{tabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={`px-4 text-sm ${
										activeTab === tab.id
											? "bg-surface-800 text-white"
											: "text-gray-400 hover:text-white hover:bg-surface-600"
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>
						<div className="h-64 bg-surface-900 relative">
							<div className={activeTab === "raw-graph" ? "h-full" : "hidden"}>
								<GraphViewer
									dot={rawDot}
									className="h-full"
									transform={sharedGraphTransform}
									onTransformChange={setSharedGraphTransform}
									showOrphaned={sharedShowOrphaned}
									onShowOrphanedChange={setSharedShowOrphaned}
								/>
							</div>
							<div className={activeTab === "expanded-graph" ? "h-full" : "hidden"}>
								<GraphViewer
									dot={expandedDot}
									className="h-full"
									transform={sharedGraphTransform}
									onTransformChange={setSharedGraphTransform}
									showOrphaned={sharedShowOrphaned}
									onShowOrphanedChange={setSharedShowOrphaned}
								/>
							</div>
							{activeTab === "raw-json" && (
								<pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto h-full">
									{evalResult ? JSON.stringify(evalResult.graph, null, 2) : "Run code to see graph"}
								</pre>
							)}
							{activeTab === "expanded-json" && (
								<pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto h-full">
									{evalResult ? JSON.stringify(evalResult.expanded, null, 2) : "Run code to see graph"}
								</pre>
							)}
						</div>
					</div>

					{(error || saveError) && (
						<div className="text-red-400 text-sm bg-red-900/20 rounded px-3 py-2">{error || saveError}</div>
					)}
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button variant="default" onClick={handleClose}>
						Cancel
					</Button>
					<Button variant="play" onClick={handleSave} disabled={saving}>
						{saving ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>
		</div>
	);
}
