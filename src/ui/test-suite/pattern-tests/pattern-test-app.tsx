/**
 * Main app for pattern tests - single-level filtering (category only).
 */

import { useCore2Audio } from "@/ui/audio/use-core2-audio";
import { Button } from "@/ui/design/button";
import { Plus, Square } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { generateCategoryColorMap, getColor } from "../shared/category-colors";
import { CategorySection } from "../shared/category-section";
import { FilterCloud } from "../shared/filter-cloud";
import { PatternTestCard } from "./pattern-test-card";
import { PatternTestEditorModal } from "./pattern-test-editor-modal";
import { getCategories, getTestsByCategory } from "./pattern-test-data";

const categories = getCategories();
const testsByCategory = getTestsByCategory();

// Pre-compute colors
const categoryColors = generateCategoryColorMap(categories);

function getCategoryColor(category: string): string {
	return getColor(categoryColors, category);
}

export function PatternTestApp() {
	const { getState, play, stop, stopAll } = useCore2Audio();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [showNewTestModal, setShowNewTestModal] = useState(false);

	const handleCategorySelect = useCallback(
		(category: string | null) => {
			stopAll();
			setSelectedCategory(category);
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

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<div className="flex justify-between items-start mb-4">
				<div>
					<h1 className="text-2xl font-bold mb-2">Auxlang Pattern Tests</h1>
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

			{showNewTestModal && <PatternTestEditorModal onClose={() => setShowNewTestModal(false)} />}

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

			{/* Test content */}
			{Array.from(testsByCategory.entries()).map(([category, tests]) => {
				const categoryVisible = visibleCategories.has(category);
				const color = getCategoryColor(category);

				return (
					<CategorySection key={category} name={category} color={color} hidden={!categoryVisible}>
						{tests.map((test) => {
							const { state, error, graphId } = getState(test.id);
							return (
								<PatternTestCard
									key={test.id}
									test={test}
									state={state}
									error={error}
									color={color}
									graphId={graphId}
									onPlay={(code) => play(test.id, code)}
									onStop={() => stop(test.id)}
								/>
							);
						})}
					</CategorySection>
				);
			})}
		</div>
	);
}
