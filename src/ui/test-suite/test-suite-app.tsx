import { useAudioInstances } from "@/ui/audio/use-audio-instances";
import { Button } from "@/ui/design/button";
import { TestCard } from "./test-card";
import { TestCategory } from "./test-category";
import { getTestsByCategory } from "./test-data";

const testsByCategory = getTestsByCategory();

export function TestSuiteApp() {
	const { getState, play, stop, stopAll } = useAudioInstances();

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<div className="flex justify-between items-start mb-4">
				<div>
					<h1 className="text-2xl font-bold mb-2">Auxlang Audio Test Suite</h1>
					<p className="text-gray-400 text-sm">
						Click "Play" on any test to hear it. Each test should produce a distinct, recognizable
						sound. Click "Stop All" to silence everything.
					</p>
				</div>
				<Button variant="stop" onClick={stopAll} className="ml-4 shrink-0">
					⏹ Stop All
				</Button>
			</div>

			{Array.from(testsByCategory.entries()).map(([category, tests]) => (
				<TestCategory key={category} name={category}>
					{tests.map((test) => {
						const { state, error } = getState(test.id);
						return (
							<TestCard
								key={test.id}
								test={test}
								state={state}
								error={error}
								onPlay={(code) => play(test.id, code)}
								onStop={() => stop(test.id)}
							/>
						);
					})}
				</TestCategory>
			))}
		</div>
	);
}
