import { useCore2Audio } from "@/ui/audio/use-core2-audio";
import { Button } from "@/ui/design/button";
import { useCallback, useMemo, useState } from "react";
import { getCategoryColor, getDeviceColor } from "./category-colors";
import { NewTestModal } from "./new-test-modal";
import { TestCard } from "./test-card";
import { TestCategory } from "./test-category";
import { getCategories, getDevicesByCategory, getTestsByCategoryAndDevice } from "./test-data";

const categories = getCategories();
const devicesByCategory = getDevicesByCategory();
const testsByCategoryAndDevice = getTestsByCategoryAndDevice();

export function TestSuiteApp() {
	const { getState, play, stop, stopAll } = useCore2Audio();
	// null = all shown, string = only that one shown
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
	const [showNewTestModal, setShowNewTestModal] = useState(false);

	const handleCategoryClick = useCallback((category: string) => {
		stopAll();
		setSelectedCategory((prev) => {
			if (prev === null) {
				return category;
			}
			if (prev === category) {
				return null;
			}
			return category;
		});
		// Reset device selection when category changes
		setSelectedDevice(null);
	}, [stopAll]);

	const handleDeviceClick = useCallback((device: string) => {
		stopAll();
		setSelectedDevice((prev) => {
			if (prev === null) {
				return device;
			}
			if (prev === device) {
				return null;
			}
			return device;
		});
	}, [stopAll]);

	// Which categories are currently visible
	const visibleCategories = useMemo(() => {
		if (selectedCategory === null) {
			return new Set(categories);
		}
		return new Set([selectedCategory]);
	}, [selectedCategory]);

	// All visible devices (from visible categories) with their category
	const visibleDevices = useMemo(() => {
		const devices: Array<{ device: string; category: string }> = [];
		for (const category of categories) {
			if (!visibleCategories.has(category)) continue;
			const categoryDevices = devicesByCategory.get(category) || [];
			for (const device of categoryDevices) {
				devices.push({ device, category });
			}
		}
		return devices;
	}, [visibleCategories]);

	// Check if a test should be visible
	const isTestVisible = useCallback(
		(category: string, device: string) => {
			if (!visibleCategories.has(category)) return false;
			if (selectedDevice !== null && device !== selectedDevice) return false;
			return true;
		},
		[visibleCategories, selectedDevice],
	);

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
				<div className="flex gap-2 ml-4 shrink-0">
					<Button variant="default" onClick={() => setShowNewTestModal(true)}>
						+ New Test
					</Button>
					<Button variant="stop" onClick={stopAll}>
						⏹ Stop All
					</Button>
				</div>
			</div>

			{showNewTestModal && <NewTestModal onClose={() => setShowNewTestModal(false)} />}

			{/* Category tag cloud */}
			<div className="mb-4">
				<h3 className="text-sm font-medium text-gray-400 mb-2 text-center">Categories</h3>
				<div className="flex flex-wrap gap-2 justify-center">
					{categories.map((category) => {
						const isActive = selectedCategory === null || selectedCategory === category;
						const color = getCategoryColor(category);
						return (
							<button
								key={category}
								type="button"
								onClick={() => handleCategoryClick(category)}
								style={{
									backgroundColor: isActive ? color : undefined,
									borderColor: color,
								}}
								className={`px-3 py-1 rounded-full text-sm transition-colors border-2 ${
									isActive
										? "text-gray-900 font-medium"
										: "bg-surface-800 text-gray-400 hover:bg-surface-700"
								}`}
							>
								{category}
							</button>
						);
					})}
				</div>
			</div>

			{/* Device name cloud */}
			<div className="mb-6">
				<h3 className="text-sm font-medium text-gray-400 mb-2 text-center">Devices</h3>
				<div className="flex flex-wrap gap-2 justify-center">
					{visibleDevices.map(({ device, category }) => {
						const isActive = selectedDevice === null || selectedDevice === device;
						const color = getDeviceColor(device);
						return (
							<button
								key={`${category}-${device}`}
								type="button"
								onClick={() => handleDeviceClick(device)}
								style={{
									backgroundColor: isActive ? color : undefined,
									borderColor: color,
								}}
								className={`px-2 py-0.5 rounded text-xs transition-colors border ${
									isActive
										? "text-gray-900 font-medium"
										: "bg-surface-800 text-gray-500 hover:bg-surface-700"
								}`}
							>
								{device}
							</button>
						);
					})}
				</div>
			</div>

			{/* Test content - always render all, use CSS to hide */}
			{Array.from(testsByCategoryAndDevice.entries()).map(([category, deviceMap]) => {
				const categoryVisible = visibleCategories.has(category);
				// Check if any tests in this category are visible
				const hasVisibleTests =
					categoryVisible &&
					(selectedDevice === null ||
						Array.from(deviceMap.keys()).includes(selectedDevice));
				const color = getCategoryColor(category);

				return (
					<TestCategory key={category} name={category} color={color} hidden={!hasVisibleTests}>
						{Array.from(deviceMap.entries()).map(([device, tests]) =>
							tests.map((test) => {
								const visible = isTestVisible(category, device);
								const { state, error } = getState(test.id);
								return (
									<div key={test.id} className={visible ? "" : "hidden"}>
										<TestCard
											test={test}
											state={state}
											error={error}
											color={color}
											onPlay={(code) => play(test.id, code)}
											onStop={() => stop(test.id)}
										/>
									</div>
								);
							}),
						)}
					</TestCategory>
				);
			})}
		</div>
	);
}
