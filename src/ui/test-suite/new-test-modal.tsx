import { useCore2Audio } from "@/ui/audio/use-core2-audio";
import { CodeEditor } from "@/ui/code-editor/code-editor";
import { Button } from "@/ui/design/button";
import { serializeTestCase } from "@/tests/interactive/parser";
import { useCallback, useState } from "react";

interface NewTestModalProps {
	onClose: () => void;
}

export function NewTestModal({ onClose }: NewTestModalProps) {
	const [name, setName] = useState("New Test");
	const [desc, setDesc] = useState("Description of what to expect");
	const [code, setCode] = useState("sin(440).out()");
	const { play, stop, getState } = useCore2Audio();

	const testId = "__new_test__";
	const { state, error } = getState(testId);

	const handlePlay = useCallback(() => {
		play(testId, code);
	}, [play, code]);

	const handleStop = useCallback(() => {
		stop(testId);
	}, [stop]);

	const handleSave = useCallback(async () => {
		const content = serializeTestCase({ name, desc, code });

		try {
			const handle = await window.showSaveFilePicker({
				suggestedName: "new-test.js",
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
			stop(testId);
			onClose();
		} catch (err) {
			if ((err as Error).name !== "AbortError") {
				console.error("Failed to save:", err);
			}
		}
	}, [name, desc, code, onClose, stop]);

	const handleClose = useCallback(() => {
		stop(testId);
		onClose();
	}, [stop, onClose]);

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-surface-800 rounded-lg p-6 w-full max-w-2xl shadow-xl">
				<h2 className="text-xl font-bold mb-4">New Test Case</h2>

				<div className="space-y-4">
					<div className="flex gap-4">
						<div className="flex-1">
							<label className="block text-sm text-gray-400 mb-1">Name</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
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

					<div>
						<label className="block text-sm text-gray-400 mb-1">Code</label>
						<div className="max-h-[300px] overflow-y-auto rounded border border-surface-600">
							<CodeEditor value={code} onChange={setCode} onRun={handlePlay} />
						</div>
					</div>

					{error && (
						<div className="text-red-400 text-sm bg-red-900/20 rounded px-3 py-2">
							{error}
						</div>
					)}
				</div>

				<div className="flex justify-between mt-6">
					<div className="flex gap-2">
						<Button variant="play" onClick={handlePlay}>
							{state === "playing" ? "▶ Restart" : "▶ Play"}
						</Button>
						<Button variant="stop" onClick={handleStop} disabled={state !== "playing"}>
							⏹ Stop
						</Button>
					</div>
					<div className="flex gap-2">
						<Button variant="default" onClick={handleClose}>
							Cancel
						</Button>
						<Button variant="play" onClick={handleSave}>
							💾 Save to File
						</Button>
					</div>
				</div>

				<p className="text-xs text-gray-500 mt-4">
					Save to src/tests/interactive/cases/category/device/ and HMR will pick it up.
				</p>
			</div>
		</div>
	);
}
