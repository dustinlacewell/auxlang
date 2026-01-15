/**
 * Main app for device tests - two-level filtering (category → device).
 */

import { useCore2Audio } from "@/ui/audio/use-core2-audio";
import { Button } from "@/ui/design/button";
import { Plus, Square } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { generateCategoryColorMap, getColor } from "../shared/category-colors";
import { CategorySection } from "../shared/category-section";
import { FilterCloud } from "../shared/filter-cloud";
import { DeviceTestCard } from "./device-test-card";
import { DeviceTestEditorModal } from "./device-test-editor-modal";
import { getCategories, getDevicesByCategory, getTestsByCategoryAndDevice } from "./device-test-data";

const categories = getCategories();
const devicesByCategory = getDevicesByCategory();
const testsByCategoryAndDevice = getTestsByCategoryAndDevice();

// Pre-compute colors
const categoryColors = generateCategoryColorMap(categories);

// Build device → category lookup for coloring
const deviceToCategory = new Map<string, string>();
for (const [category, devices] of devicesByCategory) {
	for (const device of devices) {
		deviceToCategory.set(device, category);
	}
}

function getCategoryColor(category: string): string {
	return getColor(categoryColors, category);
}

function getDeviceColor(device: string): string {
	const category = deviceToCategory.get(device);
	return category ? getCategoryColor(category) : "hsl(0, 0%, 60%)";
}

export function DeviceTestApp() {
	const { getState, play, stop, stopAll } = useCore2Audio();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
	const [showNewTestModal, setShowNewTestModal] = useState(false);

	const handleCategorySelect = useCallback(
		(category: string | null) => {
			stopAll();
			setSelectedCategory(category);
			setSelectedDevice(null);
		},
		[stopAll],
	);

	const handleDeviceSelect = useCallback(
		(device: string | null) => {
			stopAll();
			setSelectedDevice(device);
		},
		[stopAll],
	);

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
					<h1 className="text-2xl font-bold mb-2">Auxlang Device Tests</h1>
				</div>
				<div className="flex gap-2 ml-4 shrink-0">
					<Button variant="chrome" onClick={() => setShowNewTestModal(true)}>
						<span className="flex items-center gap-1.5">
							<Plus size={14} />
							New Test
						</span>
					</Button>
					<Button variant="chrome" onClick={stopAll} className="text-red-400 hover:text-red-300">
						<span className="flex items-center gap-1.5">
							<Square size={14} />
							Stop All
						</span>
					</Button>
				</div>
			</div>

			{showNewTestModal && <DeviceTestEditorModal onClose={() => setShowNewTestModal(false)} />}

			{/* Category filter */}
			<FilterCloud
				label="Categories"
				items={categories}
				selected={selectedCategory}
				getKey={(cat) => cat}
				getLabel={(cat) => cat}
				getColor={(cat) => getCategoryColor(cat)}
				onSelect={handleCategorySelect}
			/>

			{/* Device filter */}
			<FilterCloud
				label="Devices"
				items={visibleDevices}
				selected={selectedDevice ? visibleDevices.find((d) => d.device === selectedDevice) ?? null : null}
				getKey={(d) => `${d.category}-${d.device}`}
				getLabel={(d) => d.device}
				getColor={(d) => getDeviceColor(d.device)}
				onSelect={(d) => handleDeviceSelect(d?.device ?? null)}
				compact
			/>

			{/* Test content */}
			{Array.from(testsByCategoryAndDevice.entries()).map(([category, deviceMap]) => {
				const categoryVisible = visibleCategories.has(category);
				const hasVisibleTests =
					categoryVisible &&
					(selectedDevice === null || Array.from(deviceMap.keys()).includes(selectedDevice));
				const color = getCategoryColor(category);

				return (
					<CategorySection key={category} name={category} color={color} hidden={!hasVisibleTests}>
						{Array.from(deviceMap.entries()).map(([device, tests]) =>
							tests.map((test) => {
								const visible = isTestVisible(category, device);
								const { state, error, graphId } = getState(test.id);
								return (
									<div key={test.id} className={visible ? "" : "hidden"}>
										<DeviceTestCard
											test={test}
											state={state}
											error={error}
											color={color}
											graphId={graphId}
											onPlay={(code) => play(test.id, code)}
											onStop={() => stop(test.id)}
										/>
									</div>
								);
							}),
						)}
					</CategorySection>
				);
			})}
		</div>
	);
}
